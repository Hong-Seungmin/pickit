import {
  type Config,
  CONFIG_VERSION,
  defaultSettings,
  type MenuNode,
  type Preset,
} from "../types";

// ---------------------------------------------------------------------------
// JSON import / export (backup & migration)
// ---------------------------------------------------------------------------

export function exportConfig(config: Config): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pickit-config.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const TYPES = new Set(["item", "group", "separator"]);
const CONTEXTS = new Set(["selection", "image", "link", "page"]);
const OPEN_IN = new Set(["new-tab-fg", "new-tab-bg", "current"]);
const KINDS = new Set(["url", "web-share"]);

function isOptString(v: unknown): boolean {
  return v == null || typeof v === "string";
}

function isValidAction(a: Record<string, unknown>): boolean {
  if (!KINDS.has(a.kind as string)) return false;
  if (typeof a.urlTemplate !== "string") return false;
  if (!OPEN_IN.has(a.openIn as string)) return false;
  return (
    isOptString(a.shareTitle) &&
    isOptString(a.shareText) &&
    isOptString(a.shareUrl) &&
    isOptString(a.promptPrefix)
  );
}

function validContexts(v: unknown): boolean {
  return Array.isArray(v) && v.every((c) => CONTEXTS.has(c as string));
}

function isValidNode(v: unknown): v is MenuNode {
  if (!v || typeof v !== "object") return false;
  const n = v as Record<string, unknown>;
  if (typeof n.id !== "string" || !TYPES.has(n.type as string)) return false;
  if (typeof n.title !== "string" || typeof n.order !== "number") return false;
  if (typeof n.enabled !== "boolean") return false;
  if (!isOptString(n.iconUrl)) return false;
  if (!validContexts(n.contexts)) return false;
  if (n.action != null && !isValidAction(n.action as Record<string, unknown>))
    return false;
  return true;
}

function isValidPreset(v: unknown): v is Preset {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string") return false;
  if (typeof p.title !== "string") return false;
  if (!isOptString(p.iconUrl)) return false;
  if (!validContexts(p.contexts)) return false;
  if (!p.action || !isValidAction(p.action as Record<string, unknown>))
    return false;
  return true;
}

/** Parse + validate an imported JSON string. Throws on malformed input. */
export function parseConfig(text: string): Config {
  const raw = JSON.parse(text) as unknown;
  if (!raw || typeof raw !== "object") throw new Error("Not an object");
  const cfg = raw as Record<string, unknown>;
  if (!Array.isArray(cfg.nodes)) throw new Error("Missing nodes array");
  if (!cfg.nodes.every(isValidNode)) throw new Error("Invalid node in config");

  const popupNodes =
    Array.isArray(cfg.popupNodes) && cfg.popupNodes.every(isValidNode)
      ? (cfg.popupNodes as MenuNode[])
      : [];

  const customPresets =
    Array.isArray(cfg.customPresets) && cfg.customPresets.every(isValidPreset)
      ? (cfg.customPresets as Preset[])
      : [];

  const defaults = defaultSettings();
  const popupIn =
    (cfg.settings as { popup?: object } | undefined)?.popup ?? {};
  const settings = { popup: { ...defaults.popup, ...popupIn } };

  return {
    version: CONFIG_VERSION,
    nodes: cfg.nodes as MenuNode[],
    popupNodes,
    customPresets,
    settings,
  };
}
