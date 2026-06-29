# Pickit — 커스텀 우클릭 런처 (Manifest V3)

우클릭 컨텍스트 메뉴에 사용자가 직접 정의한 항목을 추가해, 선택 텍스트·이미지·링크·현재
페이지를 URL 템플릿으로 검색/공유/번역/이동하는 확장 프로그램.

**지원 브라우저**: Chrome · Microsoft Edge · Brave · Opera 등 Chromium 기반.

## 기술 스택

- **Manifest V3**: `contextMenus`, `storage`, `tabs` 권한 + 선택 팝업용 content script(`<all_urls>`)
- **Vite + @crxjs/vite-plugin** 빌드
- **TypeScript**
- **React** 옵션 UI
- **dnd-kit** 중첩 트리 드래그 재정렬
- **webextension-polyfill** (storage 레이어)

## 개발

```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 + HMR
npm run build    # 타입체크 + 프로덕션 빌드 → dist/
npm run typecheck
```

> Windows 참고: 시스템 PATH에 따옴표가 섞인 항목(예: `C:\Program Files\Tailscale"`)이
> 있으면 cmd.exe가 esbuild 후처리 스크립트의 `node`를 못 찾아 `npm install`이 실패합니다.
> 해당 셸 세션에서 `$env:PATH = ($env:PATH -replace '"','')` 후 실행하면 우회됩니다.

## 크롬에 로드

1. `npm run build`
2. `chrome://extensions` → 개발자 모드 ON
3. **압축해제된 확장 프로그램을 로드** → `dist/` 폴더 선택
4. 임의 페이지에서 텍스트 선택 후 우클릭 → 기본 프리셋(Google 검색 등) 확인
5. 확장 **옵션** 페이지에서 항목 관리

## 구조

```
src/
  manifest.ts        MV3 manifest (crxjs가 엔트리 추적)
  types.ts           데이터 모델 (MenuNode / Config)
  template.ts        URL/제목 placeholder 치환 엔진
  storage.ts         chrome.storage.sync + local fallback
  presets.ts         검증된 기본 템플릿 프리셋
  menu-builder.ts    config → contextMenus 전체 재생성
  background.ts      service worker (onClicked + 팝업 메시지 실행)
  content/           선택 팝업 메뉴 (shadow DOM content script)
  share/             Web Share 브리지 페이지
  options/           React 옵션 UI (CRUD + 트리 dnd + import/export)
public/
  _locales/{en,ko}/  i18n 메시지
  icons/             16/48/128 아이콘
```

## 데이터 모델

```ts
type MenuNode = {
  id: string;
  type: "item" | "group" | "separator";
  title: string;                       // {selection} 등 placeholder + 이모지 허용
  iconUrl?: string;                    // 옵션/툴바/미리보기용 이미지 아이콘
  parentId?: string;                   // 그룹 중첩
  order: number;                       // 재정렬용
  contexts: ("selection"|"image"|"link"|"page")[];
  action?: {
    kind: "url" | "web-share";
    urlTemplate: string;
    openIn: "new-tab-fg"|"new-tab-bg"|"current";
    shareTitle?: string; shareText?: string; shareUrl?: string;
  };
  enabled: boolean;
};
type Config = {
  version: number;
  nodes: MenuNode[];        // 컨텍스트 메뉴
  popupNodes: MenuNode[];   // 플로팅 툴바 (별도 관리)
  customPresets: Preset[];
  settings: { popup: { enabled; anchor; offsetX; offsetY; trigger… } };
};
```

### 템플릿 placeholder

| placeholder    | 값                         | 비고                         |
| -------------- | -------------------------- | ---------------------------- |
| `{selection}`  | `info.selectionText`       | encodeURIComponent 적용      |
| `{image}`      | `info.srcUrl`              | 이미지 우클릭                |
| `{link}`       | `info.linkUrl`             | 링크 우클릭                  |
| `{pageUrl}`    | `info.pageUrl`             |                              |
| `{pageTitle}`  | `tab.title`                |                              |

> 제목(title) 안에서는 브라우저 제약상 `{selection}`만 실시간 치환(`%s`)됩니다.
> 나머지 placeholder는 URL 템플릿에서만 동작합니다.

## 프리셋 / 공유 / 미리보기

- **프리셋**: 검색(Google·YouTube), 지도(**Google·네이버·카카오**), 번역, 이미지 역검색,
  공유(X·Facebook·LinkedIn·Reddit·Telegram·WhatsApp·이메일·**시스템 공유**) 내장.
  옵션의 **프리셋…** 버튼에서 카테고리별로 보고 "메뉴에 추가". 항목 편집창의
  **프리셋으로 저장**으로 내 프리셋을 만들고 재사용/삭제 가능. 프리셋은 export JSON에
  `customPresets`로 포함됨.
- **항목 아이콘**:
  - **이모지** — 제목에 직접 넣으면 우클릭 메뉴에 그대로 표시됩니다(예: `🔍 Google 검색`).
    편집창의 이모지 피커를 클릭하면 제목 커서 위치에 삽입되고, 제목 입력란 포커스 상태에서
    OS 이모지 패널(Windows `⊞ + .`, macOS `⌃⌘Space`)로 더 많은 이모지를 넣을 수 있습니다.
  - **이미지(`iconUrl`)** — 옵션 목록·선택 팝업·미리보기에 표시.
- **선택 플로팅 툴바**: 텍스트 선택 시 **단일 트리거 아이콘**이 뜨고, 클릭하면 항목 목록이
  펼쳐집니다. 컨텍스트 메뉴와 **별도 목록(`popupNodes`)**으로 관리(옵션 탭 분리). shadow
  DOM 격리, 아이콘 이미지 표시. 트리거 이모지/이미지 커스터마이즈 가능.
  - **위치**: 1차 기준점(`anchor` — 선택 영역 아래/위/좌/우, 마우스 포인터, 화면 4모서리)
    + 2차 간격(`offsetX/Y`). 옵션에 **실시간 위치 예시**(선택 텍스트·마우스 포인터·툴바 표시).
- **공유 방식**:
  - *URL intent*: 각 플랫폼 공유 URL을 새 탭으로 — 어디서나 동작.
  - *시스템 공유(`web-share`)*: 새 탭 대신 **페이지 내 플로팅 패널**을 띄워 제목/텍스트/URL(전체
    복사 가능)을 보여주고, **시스템 공유 열기**(`navigator.share`, OS/모바일 공유 시트)와
    **URL 클립보드 복사**를 제공. 컨텍스트 메뉴에서의 공유 클릭도 background→content script로
    전달돼 같은 패널로 열립니다.
- **메뉴 미리보기**: 컨텍스트 메뉴 탭 우측에서 컨텍스트별 표시 모양을 라이브 확인.

## 공유/전송 기능 동작 가능 여부 (요약)

| 기능 | 가능성 | 메커니즘 |
|---|---|---|
| 텍스트/URL → OS 공유 시트 | 가능 | `navigator.share` (HTTPS + 사용자 클릭) |
| 이미지(파일) → OS 공유 시트 | 조건부 | `fetch`→`File`→`navigator.share({files})`, `canShare` 가드, CORS 영향 |
| 기기 간 공유 | 간접 | OS 공유 시트가 Nearby/AirDrop 등으로 위임 |
| 특정 네이티브 앱 직접 실행 | 제한적 | URL 스킴(`mailto:`/`tg:`/`whatsapp:` 등) 또는 Native Messaging(별도 호스트) |
| 브라우저 내/페이지 간 공유 | 가능 | 클립보드 · URL 인텐트 · `chrome.storage` |

## 알려진 후속 작업

- 이미지 파일 `navigator.share({files})` 지원(가능 환경 한정)
- Firefox `browser.menus` 차이 검증
- 옵션 UI 문자열 i18n 전면 적용
- 스토어 배포용 정식 아이콘/스크린샷
