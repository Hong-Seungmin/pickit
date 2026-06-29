import { loadConfig, saveConfig, onConfigChanged } from "./storage";
import { rebuildMenus } from "./menu-builder";
import {
  resolveTemplate,
  resolveTemplateRaw,
  valuesFromClick,
  type TemplateValues,
} from "./template";
import { buildDefaultMenu, buildPopupPresetNodes } from "./presets";
import { type Config, type MenuNode, emptyConfig } from "./types";

// ---------------------------------------------------------------------------
// Background service worker
// ---------------------------------------------------------------------------

/** First-run seeding: if there is no stored config, install the presets. */
async function ensureSeeded(): Promise<Config> {
  const config = await loadConfig();
  if (config.nodes.length > 0 || config.popupNodes.length > 0) return config;
  const seeded: Config = {
    ...emptyConfig(),
    nodes: buildDefaultMenu(),
    popupNodes: buildPopupPresetNodes(0),
  };
  await saveConfig(seeded);
  return seeded;
}

// Serialize rebuilds: storage.onChanged can fire several times in quick
// succession (drag reorder, sync+local writes), and overlapping
// removeAll()/create() races produce "duplicate id" errors. Run at most one
// rebuild at a time and coalesce any requests that arrive while busy.
let rebuilding = false;
let rebuildQueued = false;

async function rebuildFromStorage(): Promise<void> {
  if (rebuilding) {
    rebuildQueued = true;
    return;
  }
  rebuilding = true;
  try {
    do {
      rebuildQueued = false;
      const config = await loadConfig();
      await rebuildMenus(config);
    } while (rebuildQueued);
  } finally {
    rebuilding = false;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureSeeded();
  await rebuildFromStorage();
});

chrome.runtime.onStartup.addListener(() => {
  void rebuildFromStorage();
});

// Config change → rebuild the context menu (popup reads storage itself).
onConfigChanged(() => {
  void rebuildFromStorage();
});

function openUrl(
  action: NonNullable<MenuNode["action"]>,
  url: string,
  tab?: chrome.tabs.Tab,
) {
  const mode = action.openIn;
  if (mode === "current" && tab?.id != null) {
    void chrome.tabs.update(tab.id, { url });
    return;
  }
  void chrome.tabs.create({ url, active: mode !== "new-tab-bg" });
}

/** Ask the page's content script to render the in-page share panel (instead of
 *  opening a wasteful new tab). navigator.share runs there on a user click. */
function requestSharePanel(
  values: TemplateValues,
  action: NonNullable<MenuNode["action"]>,
  tabId: number | undefined,
) {
  if (tabId == null) return;
  void chrome.tabs.sendMessage(tabId, {
    type: "pickit:share",
    title: resolveTemplateRaw(action.shareTitle ?? "", values),
    text: resolveTemplateRaw(action.shareText ?? "", values),
    url: resolveTemplateRaw(action.shareUrl ?? "", values),
  });
}

/** Execute a node's action. Shared by the context menu and the popup. */
function executeNode(
  node: MenuNode,
  values: TemplateValues,
  tab?: chrome.tabs.Tab,
) {
  if (!node.action) return;
  if (node.action.kind === "web-share") {
    requestSharePanel(values, node.action, tab?.id);
    return;
  }
  // {prompt} = promptPrefix + selection (for AI sites).
  const prefix = node.action.promptPrefix?.trim();
  const prompt = prefix
    ? `${prefix} ${values.selection ?? ""}`.trim()
    : (values.selection ?? "");
  const url = resolveTemplate(node.action.urlTemplate, { ...values, prompt });
  if (!url) return;
  openUrl(node.action, url, tab);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const config = await loadConfig();
  const node = config.nodes.find((n) => n.id === info.menuItemId);
  if (!node || node.type !== "item") return;
  executeNode(node, valuesFromClick(info, tab), tab);
});

// In-page selection popup → execute the chosen item (search both lists).
interface ExecMessage {
  type: "pickit:exec";
  nodeId: string;
  values: TemplateValues;
}

chrome.runtime.onMessage.addListener((msg: ExecMessage, sender) => {
  if (msg?.type !== "pickit:exec") return;
  void (async () => {
    const config = await loadConfig();
    const node =
      config.popupNodes.find((n) => n.id === msg.nodeId) ??
      config.nodes.find((n) => n.id === msg.nodeId);
    if (!node || node.type !== "item") return;
    executeNode(node, msg.values, sender.tab);
  })();
});
