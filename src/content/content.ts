import type { Config, MenuNode, PopupSettings } from "../types";

// ---------------------------------------------------------------------------
// In-page selection toolbar + share panel
// ---------------------------------------------------------------------------
// On text selection, show a single Pickit trigger icon near the selection.
// Clicking it expands the floating-toolbar item list. "web-share" items (and
// context-menu share clicks relayed from the background) open an in-page share
// panel with title/text/url + system-share + copy — no new tab.
// Self-contained: reads storage via chrome.* directly.
// ---------------------------------------------------------------------------

const CONFIG_KEY = "pickit:config";
const OVERFLOW_KEY = "pickit:overflow";

let config: Config | null = null;
let lastPointer = { x: 0, y: 0 };
let capturedPointer = { x: 0, y: 0 };
let activeSelection = "";

// ---- config ---------------------------------------------------------------
function normalize(raw: unknown): Config {
  const def: Config = {
    version: 1,
    nodes: [],
    popupNodes: [],
    customPresets: [],
    settings: {
      popup: {
        enabled: true,
        anchor: "selection-below",
        offsetX: 0,
        offsetY: 8,
        triggerText: "🧰",
        triggerBg: "#1f2430",
        triggerBgOpacity: 100,
        zMode: "top",
      },
    },
  };
  if (!raw || typeof raw !== "object") return def;
  const c = raw as Partial<Config>;
  return {
    version: 1,
    nodes: Array.isArray(c.nodes) ? c.nodes : [],
    popupNodes: Array.isArray(c.popupNodes) ? c.popupNodes : [],
    customPresets: [],
    settings: { popup: { ...def.settings.popup, ...(c.settings?.popup ?? {}) } },
  };
}

async function readConfig(): Promise<Config> {
  try {
    const ov = await chrome.storage.local.get(OVERFLOW_KEY);
    const area =
      ov[OVERFLOW_KEY] === true ? chrome.storage.local : chrome.storage.sync;
    const g = await area.get(CONFIG_KEY);
    return normalize(g[CONFIG_KEY]);
  } catch (err) {
    console.warn("[Pickit] config read failed", err);
    return normalize(null);
  }
}

void readConfig().then((c) => (config = c));
chrome.storage.onChanged.addListener((changes) => {
  if (CONFIG_KEY in changes) {
    config = normalize(changes[CONFIG_KEY]?.newValue);
    if (!config.settings.popup.enabled) hideToolbar();
  }
});

// ---- shared shadow host helper -------------------------------------------
function makeHost(): { host: HTMLDivElement; root: ShadowRoot } {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.top = "0";
  host.style.left = "0";
  host.style.display = "none";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  return { host, root };
}

// ---- toolbar --------------------------------------------------------------
let tbHost: HTMLDivElement | null = null;
let tbRoot: ShadowRoot | null = null;
let expanded = false;

const TB_STYLE = `
  :host { all: initial; }
  .wrap { display: inline-block; font: 13px/1.2 system-ui,"Segoe UI","Malgun Gothic",sans-serif; }
  .trigger {
    box-sizing: border-box;
    width: 30px; height: 30px; padding: 0; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    text-align: center; line-height: 1; white-space: nowrap;
    max-width: 220px; overflow: hidden; text-overflow: ellipsis;
    background: #1f2430; color: #e6e8ee; border: 1px solid #2a3040;
    border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.35);
    font-size: 19px;
  }
  .trigger:hover { border-color: #6366f1; }
  .trigger img { width: 18px; height: 18px; object-fit: contain; }
  .list {
    display: none; flex-direction: column; gap: 2px;
    background: #1f2430; border: 1px solid #2a3040; border-radius: 10px;
    padding: 4px; box-shadow: 0 8px 28px rgba(0,0,0,.4); min-width: 180px;
  }
  .list.open { display: flex; animation: pickitPop .13s ease-out; }
  @keyframes pickitPop {
    from { opacity: 0; transform: translateY(-5px) scale(.96); }
    to   { opacity: 1; transform: none; }
  }
  .item {
    display: flex; align-items: center; gap: 8px; text-align: left;
    background: transparent; color: #e6e8ee; border: 0; border-radius: 7px;
    padding: 7px 9px; cursor: pointer; white-space: nowrap;
  }
  .item:hover { background: #2b3040; }
  .item img { width: 16px; height: 16px; object-fit: contain; flex: 0 0 auto; }
  .label { overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
`;

function ensureToolbar(): ShadowRoot {
  if (tbRoot) return tbRoot;
  const { host, root } = makeHost();
  tbHost = host;
  tbRoot = root;
  const style = document.createElement("style");
  style.textContent = TB_STYLE;
  root.appendChild(style);
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  // Keep selection alive while interacting with the toolbar.
  wrap.addEventListener("mousedown", (e) => e.preventDefault());
  wrap.innerHTML = `<button class="trigger" type="button"></button><div class="list"></div>`;
  root.appendChild(wrap);
  return root;
}

function hideToolbar() {
  if (tbHost) tbHost.style.display = "none";
  expanded = false;
  const list = tbRoot?.querySelector(".list");
  list?.classList.remove("open");
}

function popupItems(): MenuNode[] {
  if (!config) return [];
  return config.popupNodes
    .filter((n) => n.enabled && n.type === "item" && !!n.action)
    .sort((a, b) => a.order - b.order);
}

function displayLabel(title: string, selection: string): string {
  const sample =
    selection.length > 16 ? `${selection.slice(0, 16)}…` : selection;
  return (
    title
      .replace(/\{selection\}/g, sample)
      .replace(/\{(image|link|pageUrl|pageTitle)\}/g, "")
      .trim() || "항목"
  );
}

function resolveRaw(t: string, selection: string): string {
  return t
    .replace(/\{selection\}/g, selection)
    .replace(/\{pageUrl\}/g, location.href)
    .replace(/\{pageTitle\}/g, document.title)
    .replace(/\{(image|link)\}/g, "");
}

function runItem(node: MenuNode) {
  hideToolbar();
  const action = node.action!;
  if (action.kind === "web-share") {
    showSharePanel({
      title: resolveRaw(action.shareTitle ?? "", activeSelection),
      text: resolveRaw(action.shareText ?? "", activeSelection),
      url: resolveRaw(action.shareUrl ?? "", activeSelection),
    });
    return;
  }
  chrome.runtime.sendMessage({
    type: "pickit:exec",
    nodeId: node.id,
    values: {
      selection: activeSelection,
      pageUrl: location.href,
      pageTitle: document.title,
    },
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [31, 36, 48]; // fallback #1f2430
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function applyTriggerStyle(btn: HTMLButtonElement, settings: PopupSettings) {
  const base =
    settings.triggerBg && settings.triggerBg !== "transparent"
      ? settings.triggerBg
      : "#1f2430";
  const op = settings.triggerBgOpacity ?? 100;
  const [r, g, b] = hexToRgb(base);
  // Opacity applies to the BACKGROUND only (rgba), never the text/icon.
  btn.style.background = `rgba(${r}, ${g}, ${b}, ${op / 100})`;
  btn.style.border = "none"; // no border per design
  btn.style.boxShadow = op === 0 ? "none" : "0 4px 16px rgba(0,0,0,.35)";
  // Font.
  btn.style.color = settings.triggerColor || "#e6e8ee";
  btn.style.fontFamily = settings.triggerFontFamily ?? "";
  btn.style.fontSize = `${settings.triggerFontSize ?? 19}px`;
  btn.style.fontWeight = settings.triggerBold ? "700" : "400";
}

function renderTrigger(settings: PopupSettings) {
  const btn = tbRoot!.querySelector(".trigger") as HTMLButtonElement;
  btn.replaceChildren();
  applyTriggerStyle(btn, settings);

  const text = settings.triggerText || "🧰";
  // Stay square for short glyphs; grow with padding for longer text labels.
  const isShort = [...text].length <= 2;
  btn.style.width = isShort ? "30px" : "auto";
  btn.style.padding = isShort ? "0" : "0 10px";

  if (settings.triggerIconUrl) {
    const img = document.createElement("img");
    img.src = settings.triggerIconUrl;
    img.alt = "Pickit";
    img.addEventListener("error", () => {
      img.remove();
      btn.textContent = text;
    });
    btn.appendChild(img);
  } else {
    btn.textContent = text;
  }
}

function renderList() {
  const list = tbRoot!.querySelector(".list") as HTMLDivElement;
  list.replaceChildren();
  for (const node of popupItems()) {
    const item = document.createElement("button");
    item.className = "item";
    item.type = "button";
    if (node.iconUrl) {
      const img = document.createElement("img");
      img.src = node.iconUrl;
      img.alt = "";
      img.addEventListener("error", () => img.remove());
      item.appendChild(img);
    }
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = displayLabel(node.title, activeSelection);
    item.appendChild(label);
    item.addEventListener("click", () => runItem(node));
    list.appendChild(item);
  }
}

function placeToolbar(rect: DOMRect, settings: PopupSettings) {
  if (!tbHost) return;
  const { width, height } = tbHost.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;
  switch (settings.anchor) {
    case "selection-above":
      top = rect.top - height;
      left = rect.left;
      break;
    case "selection-left":
      top = rect.top;
      left = rect.left - width;
      break;
    case "selection-right":
      top = rect.top;
      left = rect.right;
      break;
    case "cursor":
      top = capturedPointer.y;
      left = capturedPointer.x;
      break;
    case "viewport-top-left":
      top = 0;
      left = 0;
      break;
    case "viewport-top-right":
      top = 0;
      left = vw - width;
      break;
    case "viewport-bottom-left":
      top = vh - height;
      left = 0;
      break;
    case "viewport-bottom-right":
      top = vh - height;
      left = vw - width;
      break;
    case "selection-below":
    default:
      top = rect.bottom;
      left = rect.left;
      break;
  }
  top += settings.offsetY;
  left += settings.offsetX;
  tbHost.style.left = `${Math.max(4, Math.min(left, vw - width - 4))}px`;
  tbHost.style.top = `${Math.max(4, Math.min(top, vh - height - 4))}px`;
}

function zIndexFor(settings: PopupSettings): string {
  if (settings.zMode === "bottom") return "0";
  if (settings.zMode === "custom")
    return String(settings.zCustom ?? 2147483647);
  return "2147483647";
}

function showToolbar(selection: string, rect: DOMRect, settings: PopupSettings) {
  if (popupItems().length === 0) return;
  activeSelection = selection;
  capturedPointer = { ...lastPointer }; // freeze pointer at show time
  ensureToolbar();
  tbHost!.style.zIndex = zIndexFor(settings);
  renderTrigger(settings);
  renderList();
  expanded = false;
  const list = tbRoot!.querySelector(".list") as HTMLDivElement;
  const btn = tbRoot!.querySelector(".trigger") as HTMLButtonElement;
  list.classList.remove("open");
  btn.style.display = "inline-flex";
  // Click the single trigger → hide it and reveal the list in place.
  btn.onclick = () => {
    if (expanded) return;
    expanded = true;
    btn.style.display = "none";
    list.classList.add("open");
    placeToolbar(rect, settings); // re-clamp for the list's size, same anchor
  };
  tbHost!.style.display = "block";
  placeToolbar(rect, settings);
}

// ---- share panel ----------------------------------------------------------
let shHost: HTMLDivElement | null = null;
let shRoot: ShadowRoot | null = null;

const SH_STYLE = `
  :host { all: initial; }
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); }
  .card {
    position: fixed; top: 16%; left: 50%; transform: translateX(-50%);
    width: min(440px, 92vw);
    background: #171a23; color: #e6e8ee; border: 1px solid #2a3040;
    border-radius: 12px; padding: 18px;
    box-shadow: 0 16px 50px rgba(0,0,0,.5);
    font: 14px/1.5 system-ui,"Segoe UI","Malgun Gothic",sans-serif;
  }
  .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .head h2 { margin: 0; font-size: 16px; }
  .x { background: none; border: 0; color: #9aa3b2; font-size: 18px; cursor: pointer; }
  .row { margin-bottom: 10px; }
  .row .k { color: #9aa3b2; font-size: 12px; margin-bottom: 2px; }
  .row input, .row textarea {
    box-sizing: border-box; width: 100%; background: #1f2430; color: #e6e8ee;
    border: 1px solid #2a3040; border-radius: 8px; padding: 7px 9px;
    font-size: 13px; font-family: inherit; resize: vertical;
  }
  .actions { display: flex; gap: 8px; margin-top: 14px; }
  .btn {
    background: #1f2430; color: #e6e8ee; border: 1px solid #2a3040;
    border-radius: 8px; padding: 9px 12px; cursor: pointer; font-size: 13px;
  }
  .btn.primary { background: #4f46e5; border-color: #4f46e5; }
  .status { margin-top: 10px; min-height: 1.2em; color: #818cf8; font-size: 13px; }
`;

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

function ensureShare(): ShadowRoot {
  if (shRoot) return shRoot;
  const { host, root } = makeHost();
  shHost = host;
  shRoot = root;
  const style = document.createElement("style");
  style.textContent = SH_STYLE;
  root.appendChild(style);
  host.style.top = "0";
  host.style.left = "0";
  host.style.right = "0";
  host.style.bottom = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  return root;
}

function hideShare() {
  if (shHost) shHost.style.display = "none";
}

function showSharePanel(p: SharePayload) {
  const root = ensureShare();
  root.querySelectorAll(".overlay,.card").forEach((n) => n.remove());

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.addEventListener("click", hideShare);

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="head"><h2>공유</h2><button class="x" type="button">✕</button></div>
    <div class="row"><div class="k">제목</div><input class="t" type="text" /></div>
    <div class="row"><div class="k">텍스트</div><textarea class="x2" rows="3"></textarea></div>
    <div class="row"><div class="k">URL</div><input class="url" type="text" readonly /></div>
    <div class="actions">
      <button class="btn primary share" type="button">시스템 공유 열기</button>
      <button class="btn copy" type="button">URL 클립보드 복사</button>
    </div>
    <div class="status"></div>`;

  const titleInput = card.querySelector(".t") as HTMLInputElement;
  const textInput = card.querySelector(".x2") as HTMLTextAreaElement;
  const urlInput = card.querySelector(".url") as HTMLInputElement;
  titleInput.value = p.title;
  textInput.value = p.text;
  urlInput.value = p.url;

  const status = card.querySelector(".status") as HTMLElement;
  (card.querySelector(".x") as HTMLButtonElement).onclick = hideShare;

  const shareBtn = card.querySelector(".share") as HTMLButtonElement;
  if (typeof navigator.share !== "function") {
    shareBtn.remove(); // not available here → keep copy only
  } else {
    shareBtn.onclick = async () => {
      try {
        const data: ShareData = {};
        if (titleInput.value) data.title = titleInput.value;
        if (textInput.value) data.text = textInput.value;
        if (urlInput.value) data.url = urlInput.value;
        await navigator.share(data);
        status.textContent = "공유 완료.";
      } catch (err) {
        if ((err as Error)?.name !== "AbortError")
          status.textContent = `공유 실패: ${(err as Error)?.message ?? ""}`;
      }
    };
  }

  (card.querySelector(".copy") as HTMLButtonElement).onclick = async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      status.textContent = "URL을 복사했습니다.";
    } catch {
      urlInput.select();
      status.textContent = "복사 권한이 없어 선택했습니다. Ctrl/⌘+C로 복사하세요.";
    }
  };

  root.appendChild(overlay);
  root.appendChild(card);
  shHost!.style.display = "block";
}

// ---- selection tracking ---------------------------------------------------
function currentSelection(): { text: string; rect: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().trim();
  if (!text) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { text, rect };
}

function evaluate() {
  const settings = config?.settings.popup;
  if (!settings?.enabled) return hideToolbar();
  const sel = currentSelection();
  if (!sel) return hideToolbar();
  showToolbar(sel.text, sel.rect, settings);
}

document.addEventListener("mouseup", (e) => {
  lastPointer = { x: e.clientX, y: e.clientY };
  if (tbHost && e.composedPath().includes(tbHost)) return;
  if (shHost && e.composedPath().includes(shHost)) return;
  setTimeout(evaluate, 0);
});

document.addEventListener("keyup", (e) => {
  if (e.shiftKey || e.key === "a") setTimeout(evaluate, 0);
});

document.addEventListener("selectionchange", () => {
  if (!currentSelection() && !expanded) hideToolbar();
});

document.addEventListener("scroll", () => hideToolbar(), true);
window.addEventListener("resize", () => hideToolbar());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideToolbar();
    hideShare();
  }
});

// Context-menu share clicks are relayed here so the panel is in-page.
chrome.runtime.onMessage.addListener((msg: SharePayload & { type: string }) => {
  if (msg?.type === "pickit:share") {
    showSharePanel({ title: msg.title, text: msg.text, url: msg.url });
  }
});

console.info("[Pickit] selection toolbar ready");
