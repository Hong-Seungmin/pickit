import { useRef, useState } from "react";
import {
  ALL_CONTEXTS,
  type ActionKind,
  defaultAction,
  type MenuNode,
  type OpenIn,
  type PickitContext,
  placeholdersForContexts,
} from "../../types";
import { EMOJI_CHOICES } from "../../presets";

const CONTEXT_LABEL: Record<PickitContext, string> = {
  selection: "선택 텍스트 (selection)",
  image: "이미지 (image)",
  link: "링크 (link)",
  page: "페이지 (page)",
};

const OPEN_IN_LABEL: Record<OpenIn, string> = {
  "new-tab-fg": "새 탭 — 포그라운드",
  "new-tab-bg": "새 탭 — 백그라운드",
  current: "현재 탭",
};

/** A text input with context-filtered placeholder insert buttons. */
function TemplateField({
  label,
  value,
  placeholder,
  placeholders,
  onChange,
  error,
}: {
  label: string;
  value: string;
  placeholder?: string;
  placeholders: string[];
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {placeholders.length > 0 && (
        <div className="placeholders">
          {placeholders.map((ph) => (
            <button
              key={ph}
              type="button"
              className="btn btn--xs"
              onClick={() => onChange(value + ph)}
            >
              {ph}
            </button>
          ))}
        </div>
      )}
      {error && <small className="err">{error}</small>}
    </label>
  );
}

export interface NodeEditorProps {
  node: MenuNode;
  groups: MenuNode[]; // selectable parent groups (excluding self/descendants)
  onSave: (node: MenuNode) => void;
  onCancel: () => void;
  onSaveAsPreset?: (node: MenuNode) => void;
  /** Floating-toolbar item: selection-only, no contexts/parent pickers. */
  popupMode?: boolean;
}

export function NodeEditor({
  node,
  groups,
  onSave,
  onCancel,
  onSaveAsPreset,
  popupMode = false,
}: NodeEditorProps) {
  const [draft, setDraft] = useState<MenuNode>(node);
  const isItem = draft.type === "item";
  const action = draft.action ?? defaultAction();
  const isShare = action.kind === "web-share";
  // Popup items are selection-triggered; only selection/page values resolve.
  const phs = popupMode
    ? ["{selection}", "{pageUrl}", "{pageTitle}"]
    : placeholdersForContexts(draft.contexts);

  const titleRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<MenuNode>) => setDraft((d) => ({ ...d, ...p }));

  /** Insert an emoji at the title caret (helps decorate the title). */
  function insertEmoji(em: string) {
    const el = titleRef.current;
    const cur = draft.title;
    if (!el) {
      patch({ title: cur + em });
      return;
    }
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? start;
    const next = cur.slice(0, start) + em + cur.slice(end);
    patch({ title: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + em.length;
      el.setSelectionRange(pos, pos);
    });
  }
  const patchAction = (p: Partial<MenuNode["action"]>) =>
    setDraft((d) => ({
      ...d,
      action: { ...(d.action ?? defaultAction()), ...p } as MenuNode["action"],
    }));

  function toggleContext(c: PickitContext) {
    const has = draft.contexts.includes(c);
    patch({
      contexts: has
        ? draft.contexts.filter((x) => x !== c)
        : [...draft.contexts, c],
    });
  }

  const titleError = !draft.title.trim();
  const contextError = isItem && !popupMode && draft.contexts.length === 0;
  const urlError =
    isItem && !isShare && !(action.urlTemplate ?? "").trim();
  const shareError =
    isItem &&
    isShare &&
    !(action.shareUrl ?? "").trim() &&
    !(action.shareText ?? "").trim();
  const canSave = !titleError && !contextError && !urlError && !shareError;

  return (
    <div className="modal__backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{draft.type === "group" ? "그룹 편집" : "항목 편집"}</h2>

        <label className="field">
          <span>제목 (title)</span>
          <div className="title-row">
            {draft.iconUrl ? (
              <img
                className="title-row__icon"
                src={draft.iconUrl}
                alt=""
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
            ) : null}
            <input
              ref={titleRef}
              value={draft.title}
              placeholder={isItem ? '🔍 Google: "{selection}"' : "그룹 이름"}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>
          {titleError && <small className="err">제목을 입력하세요.</small>}
        </label>

        <div className="field">
          <span>이모지 추가 (제목 꾸미기)</span>
          <div className="emoji-picker">
            {EMOJI_CHOICES.map((em) => (
              <button
                key={em}
                type="button"
                className="emoji-pick"
                onClick={() => insertEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
          <small className="hint">
            클릭하면 제목 커서 위치에 삽입됩니다. 더 많은 이모지는 제목 입력란에
            포커스한 뒤 <b>Windows ⊞ + .</b> 또는 <b>macOS ⌃⌘Space</b>로 OS 이모지
            패널을 여세요.
          </small>
        </div>

        <label className="field">
          <span>이미지 아이콘 URL (선택)</span>
          <input
            value={draft.iconUrl ?? ""}
            placeholder="https://example.com/favicon.ico"
            onChange={(e) => patch({ iconUrl: e.target.value || undefined })}
          />
          <small className="hint">
            옵션 목록·선택 팝업·미리보기에 표시됩니다.
          </small>
        </label>

        {isItem && (
          <>
            {!popupMode && (
              <fieldset className="field">
                <legend>적용 컨텍스트 (contexts)</legend>
                <div className="checks">
                  {ALL_CONTEXTS.map((c) => (
                    <label key={c} className="check">
                      <input
                        type="checkbox"
                        checked={draft.contexts.includes(c)}
                        onChange={() => toggleContext(c)}
                      />
                      {CONTEXT_LABEL[c]}
                    </label>
                  ))}
                </div>
                {contextError && (
                  <small className="err">하나 이상 선택하세요.</small>
                )}
              </fieldset>
            )}

            <label className="field">
              <span>동작 종류 (action)</span>
              <select
                value={action.kind}
                onChange={(e) =>
                  patchAction({ kind: e.target.value as ActionKind })
                }
              >
                <option value="url">URL 열기</option>
                <option value="web-share">시스템 공유 시트 (Web Share)</option>
              </select>
            </label>

            {!isShare ? (
              <>
                <TemplateField
                  label="URL 템플릿 (urlTemplate)"
                  value={action.urlTemplate ?? ""}
                  placeholder="https://www.google.com/search?q={selection}"
                  placeholders={[...phs, "{prompt}"]}
                  onChange={(v) => patchAction({ urlTemplate: v })}
                  error={urlError ? "URL 템플릿을 입력하세요." : undefined}
                />
                <label className="field">
                  <span>프롬프트 접두 (AI용, 선택)</span>
                  <input
                    value={action.promptPrefix ?? ""}
                    placeholder="예: 다음 내용을 한국어로 요약해줘:"
                    onChange={(e) =>
                      patchAction({ promptPrefix: e.target.value || undefined })
                    }
                  />
                  <small className="hint">
                    URL의 <code>{"{prompt}"}</code>에 “접두 + 선택 텍스트”가 합쳐져
                    들어갑니다(자동 인코딩). ChatGPT·Claude 등에 사용.
                  </small>
                </label>
                <label className="field">
                  <span>열기 방식 (openIn)</span>
                  <select
                    value={action.openIn}
                    onChange={(e) =>
                      patchAction({ openIn: e.target.value as OpenIn })
                    }
                  >
                    {(Object.keys(OPEN_IN_LABEL) as OpenIn[]).map((o) => (
                      <option key={o} value={o}>
                        {OPEN_IN_LABEL[o]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <>
                <small className="hint">
                  클릭하면 공유 페이지가 열리고, 버튼을 누르면 OS/모바일 공유
                  시트가 호출됩니다.
                </small>
                <TemplateField
                  label="공유 제목 (title)"
                  value={action.shareTitle ?? ""}
                  placeholder="{pageTitle}"
                  placeholders={phs}
                  onChange={(v) => patchAction({ shareTitle: v })}
                />
                <TemplateField
                  label="공유 텍스트 (text)"
                  value={action.shareText ?? ""}
                  placeholder="{selection}"
                  placeholders={phs}
                  onChange={(v) => patchAction({ shareText: v })}
                />
                <TemplateField
                  label="공유 URL (url)"
                  value={action.shareUrl ?? ""}
                  placeholder="{pageUrl}"
                  placeholders={phs}
                  onChange={(v) => patchAction({ shareUrl: v })}
                  error={
                    shareError ? "텍스트 또는 URL 중 하나는 필요합니다." : undefined
                  }
                />
              </>
            )}
          </>
        )}

        {!popupMode && (
          <label className="field">
            <span>상위 그룹 (parent)</span>
            <select
              value={draft.parentId ?? ""}
              onChange={(e) => patch({ parentId: e.target.value || undefined })}
            >
              <option value="">(최상위)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || "(제목 없음)"}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="check check--inline">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          활성화 (enabled)
        </label>

        <div className="modal__actions">
          {isItem && onSaveAsPreset && (
            <button
              className="btn"
              disabled={!canSave}
              onClick={() => onSaveAsPreset(draft)}
              title="이 항목을 재사용 가능한 프리셋으로 저장"
            >
              프리셋으로 저장
            </button>
          )}
          <span className="modal__spacer" />
          <button className="btn" onClick={onCancel}>
            취소
          </button>
          <button
            className="btn btn--primary"
            disabled={!canSave}
            onClick={() => onSave(draft)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
