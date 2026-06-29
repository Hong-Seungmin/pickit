# Chrome Web Store 제출 가이드 (Pickit)

## 0. 사전 준비
- **개발자 계정 등록**: https://chrome.google.com/webstore/devconsole → 최초 1회 **$5 USD** 등록비.
- **업로드 패키지**: `npm run build` 후 `dist/`의 **내용물**을 zip으로 압축
  (zip 루트에 `manifest.json`이 와야 함). 이미 생성됨: `pickit-upload.zip`.
  - PowerShell 재생성: `Compress-Archive -Path dist/* -DestinationPath pickit-upload.zip -Force`

## 1. 리스팅에 필요한 이미지 (직접 준비)
- **아이콘 128×128**: 포함됨(`public/icons/icon-128.png`) — 단, 현재는 플레이스홀더라
  실제 로고 이미지로 교체 권장.
- **스크린샷**: 최소 1장, **1280×800** 또는 640×400 PNG/JPG.
  옵션 화면, 우클릭 메뉴, 플로팅 툴바/공유 패널 캡처 권장(2~5장).
- (선택) 작은 프로모 타일 440×280.

## 2. 스토어 등록 정보 (복사해서 사용)

**이름**: Pickit — 커스텀 우클릭 런처

**요약(132자 이내)**:
> 선택한 텍스트·링크·이미지·페이지를 내가 만든 메뉴와 플로팅 툴바로 검색·번역·지도·AI·공유.

**설명**:
> Pickit은 우클릭 컨텍스트 메뉴와 텍스트 선택 시 뜨는 플로팅 툴바에 사용자가 직접
> 정의한 항목을 추가하는 확장입니다. URL 템플릿({selection}, {pageUrl} 등)으로
> 검색·번역·지도·AI 질의·공유를 한 번에 실행합니다.
>
> • 사용자 정의 메뉴 항목 CRUD, 그룹/서브메뉴, 드래그 재정렬
> • 내장 프리셋: Google·Bing·네이버·위키백과 검색, Google/네이버/카카오 지도,
>   이미지 검색, 번역, ChatGPT·Claude·Perplexity·Gemini, 다양한 공유
> • 텍스트 선택 시 플로팅 툴바(위치·아이콘·배경·폰트 커스터마이즈)
> • 시스템 공유 시트(Web Share) 연동, JSON 가져오기/내보내기
> • 설정은 chrome.storage로 기기 간 동기화. 데이터를 외부로 전송하지 않습니다.

**카테고리**: 생산성(Productivity)
**언어**: 한국어(기본), 영어

## 3. 개인정보 보호 탭 (필수 입력)
- **단일 목적(Single purpose)**:
  > 선택한 텍스트/링크/이미지/현재 페이지를 사용자가 정의한 URL 템플릿으로
  > 검색·공유·번역·이동하는 런처.
- **권한 사유(Permission justification)** — 각 항목에 입력:
  - `contextMenus`: 사용자가 정의한 항목을 우클릭 메뉴에 추가/실행하기 위해 필요.
  - `storage`: 사용자의 메뉴·툴바 설정을 저장하고 기기 간 동기화하기 위해 필요.
  - `tabs`: 클릭한 항목의 URL을 새 탭/현재 탭에서 열고, 페이지 제목(tab.title)을
    템플릿 값으로 사용하기 위해 필요.
  - **호스트 권한(모든 사이트)**: 텍스트 선택 시 페이지에 플로팅 툴바를 표시하는
    콘텐츠 스크립트 실행을 위해 필요. 페이지 내용을 외부로 전송하지 않음.
  - **원격 코드 사용**: 아니오(No).
- **데이터 사용 공개**: 개인정보/사용자 데이터 수집·전송 **없음**으로 체크.
- **개인정보처리방침 URL**: 호스트된 `PRIVACY.md` 주소.
  - 가장 쉬운 방법: GitHub에서 `PRIVACY.md`를 열고 그 URL 사용, 또는 GitHub Pages 활성화.
  - raw 예: `https://raw.githubusercontent.com/Hong-Seungmin/pickit/main/PRIVACY.md`

## 4. 제출
1. 개발자 대시보드 → **새 항목** → `pickit-upload.zip` 업로드
2. 위 등록 정보·이미지·개인정보 탭 작성
3. **검토 제출**. 검토는 보통 수 시간~수 일 소요(호스트 권한/콘텐츠 스크립트가 있어
   심사가 더 길어질 수 있음).

## 참고/주의
- `<all_urls>` 콘텐츠 스크립트가 있어 "모든 사이트의 데이터 읽기/변경" 경고가 설치 시
  표시되고 심사가 깐깐해질 수 있습니다. 권한 사유를 명확히 적으세요.
- 현재 빌드에는 소스맵(`.map`)이 포함됩니다. 용량/노출이 신경 쓰이면 `vite.config.ts`의
  `build.sourcemap`을 `false`로 두고 다시 빌드하세요.
- manifest의 이름/설명은 `_locales`(en/ko)로 현지화되어 스토어에 표시됩니다.
- 버전 업데이트 시 `package.json`의 `version`을 올리고 재빌드→재압축→대시보드에서 새 패키지 업로드.
