// ---------------------------------------------------------------------------
// Pickit data model
// ---------------------------------------------------------------------------

/** Contexts a node can be shown in. Maps 1:1 onto a subset of
 *  chrome.contextMenus.ContextType (see menu-builder.ts). */
export type PickitContext = "selection" | "image" | "link" | "page";

export const ALL_CONTEXTS: PickitContext[] = [
  "selection",
  "image",
  "link",
  "page",
];

/** Placeholders made available by each context (for context-filtered UI). */
export const CONTEXT_PLACEHOLDERS: Record<PickitContext, string[]> = {
  selection: ["{selection}"],
  image: ["{image}"],
  link: ["{link}"],
  page: ["{pageUrl}", "{pageTitle}"],
};

/** Placeholders available for the given selected contexts (deduped, ordered). */
export function placeholdersForContexts(contexts: PickitContext[]): string[] {
  const out: string[] = [];
  for (const c of ALL_CONTEXTS) {
    if (!contexts.includes(c)) continue;
    for (const ph of CONTEXT_PLACEHOLDERS[c]) if (!out.includes(ph)) out.push(ph);
  }
  return out;
}

/** How a resolved URL should be opened when the item is clicked. */
export type OpenIn = "new-tab-fg" | "new-tab-bg" | "current";

export type MenuNodeType = "item" | "group" | "separator";

/** "url" opens a resolved URL template; "web-share" invokes the OS/browser
 *  share sheet (navigator.share) via an internal bridge page. */
export type ActionKind = "url" | "web-share";

export interface MenuAction {
  kind: ActionKind;
  /** kind === "url": the URL template, e.g. https://google.com/search?q={selection} */
  urlTemplate: string;
  openIn: OpenIn;
  /** Prefix combined with the selection to form {prompt} (for AI sites):
   *  {prompt} = encodeURIComponent(`${promptPrefix} ${selection}`). */
  promptPrefix?: string;
  /** kind === "web-share": fields passed to navigator.share (placeholders allowed). */
  shareTitle?: string;
  shareText?: string;
  shareUrl?: string;
}

export function defaultAction(): MenuAction {
  return { kind: "url", urlTemplate: "", openIn: "new-tab-fg" };
}

export interface MenuNode {
  id: string;
  type: MenuNodeType;
  /** May contain placeholders ({selection} → %s in title) and emoji. */
  title: string;
  /** Optional icon URL. Shown in the options UI, menu preview, and the
   *  in-page selection popup. */
  iconUrl?: string;
  /** Parent group id for nesting; undefined = root. */
  parentId?: string;
  /** Ordering among siblings (ascending). */
  order: number;
  contexts: PickitContext[];
  /** Present only for type === "item". */
  action?: MenuAction;
  enabled: boolean;
}

/** A reusable template the user can add to the menu. Built-ins ship with the
 *  extension (builtin: true); user-saved ones live in Config.customPresets. */
export interface Preset {
  id: string;
  name: string;
  category?: string;
  builtin?: boolean;
  title: string;
  iconUrl?: string;
  contexts: PickitContext[];
  action: MenuAction;
}

/** Primary anchor (reference point) for the floating toolbar. */
export type PopupAnchor =
  | "selection-below"
  | "selection-above"
  | "selection-left"
  | "selection-right"
  | "cursor"
  | "viewport-top-left"
  | "viewport-top-right"
  | "viewport-bottom-left"
  | "viewport-bottom-right";

export const POPUP_ANCHORS: { value: PopupAnchor; label: string }[] = [
  { value: "selection-below", label: "선택 영역 — 아래" },
  { value: "selection-above", label: "선택 영역 — 위" },
  { value: "selection-left", label: "선택 영역 — 왼쪽" },
  { value: "selection-right", label: "선택 영역 — 오른쪽" },
  { value: "cursor", label: "마우스 포인터" },
  { value: "viewport-top-left", label: "화면 — 좌상단" },
  { value: "viewport-top-right", label: "화면 — 우상단" },
  { value: "viewport-bottom-left", label: "화면 — 좌하단" },
  { value: "viewport-bottom-right", label: "화면 — 우하단" },
];

export interface PopupSettings {
  /** Show a floating toolbar near selected text. */
  enabled: boolean;
  /** 1차: 기준점. */
  anchor: PopupAnchor;
  /** 2차: 기준점으로부터의 간격(px). */
  offsetX: number;
  offsetY: number;
  /** Toolbar trigger appearance. */
  triggerIconUrl?: string;
  /** Glyph/text shown on the trigger when no image is set (emoji OR text). */
  triggerText?: string;
  /** Trigger background base color (hex). */
  triggerBg?: string;
  /** Background opacity 0–100 (0 = fully transparent). */
  triggerBgOpacity?: number;
  /** Trigger text font. */
  triggerFontFamily?: string;
  triggerFontSize?: number;
  triggerBold?: boolean;
  triggerColor?: string;
  /** Stacking order vs other page/extension overlays. */
  zMode: PopupZMode;
  /** Custom z-index when zMode === "custom". */
  zCustom?: number;
}

/** Layering of the floating toolbar against other overlays. */
export type PopupZMode = "bottom" | "custom" | "top";

/** Curated font-family choices for the trigger text. */
export const TRIGGER_FONTS: { value: string; label: string }[] = [
  { value: "", label: "시스템 기본" },
  { value: "system-ui, sans-serif", label: "Sans-serif" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "'Courier New', ui-monospace, monospace", label: "Monospace" },
  { value: "'Malgun Gothic', AppleGothic, sans-serif", label: "맑은 고딕" },
  { value: "'Comic Sans MS', cursive", label: "Comic Sans" },
];

/** Global behavior settings. */
export interface PickitSettings {
  popup: PopupSettings;
}

export function defaultSettings(): PickitSettings {
  return {
    popup: {
      enabled: true,
      anchor: "selection-below",
      offsetX: 0,
      offsetY: 8,
      triggerText: "🧰",
      triggerBg: "#1f2430",
      triggerBgOpacity: 100,
      triggerFontSize: 19,
      triggerColor: "#e6e8ee",
      triggerBold: false,
      zMode: "top",
    },
  };
}

export interface Config {
  version: number;
  /** Context-menu items (chrome.contextMenus). */
  nodes: MenuNode[];
  /** Floating-toolbar items — managed separately from the context menu. */
  popupNodes: MenuNode[];
  /** User-saved presets (built-in presets are not stored here). */
  customPresets: Preset[];
  settings: PickitSettings;
}

export const CONFIG_VERSION = 1;

export function emptyConfig(): Config {
  return {
    version: CONFIG_VERSION,
    nodes: [],
    popupNodes: [],
    customPresets: [],
    settings: defaultSettings(),
  };
}

/** Cheap id generator — crypto.randomUUID is available in SW + options page. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Materialize a Preset into a fresh MenuNode placed at `order`. */
export function presetToNode(preset: Preset, order: number): MenuNode {
  return {
    id: newId(),
    type: "item",
    title: preset.title,
    iconUrl: preset.iconUrl,
    order,
    contexts: [...preset.contexts],
    action: { ...preset.action },
    enabled: true,
  };
}
