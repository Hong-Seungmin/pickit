import browser from "webextension-polyfill";
import {
  type Config,
  CONFIG_VERSION,
  defaultSettings,
  emptyConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Storage layer
// ---------------------------------------------------------------------------
// Primary: chrome.storage.sync (roams across devices, ~100KB total / 8KB item).
// Fallback: chrome.storage.local when a sync write exceeds quota.
//
// Strategy: store the whole Config under CONFIG_KEY. On save we try sync first;
// if it throws (typically QUOTA_BYTES_PER_ITEM), we write to local and flip an
// OVERFLOW_KEY flag (kept in local). On load we honor that flag.
// ---------------------------------------------------------------------------

const CONFIG_KEY = "pickit:config";
const OVERFLOW_KEY = "pickit:overflow";

export type StorageArea = "sync" | "local";

function migrate(raw: unknown): Config {
  if (!raw || typeof raw !== "object") return emptyConfig();
  const cfg = raw as Partial<Config>;
  if (!Array.isArray(cfg.nodes)) return emptyConfig();
  // Future migrations switch on cfg.version here.
  const defaults = defaultSettings();
  return {
    version: CONFIG_VERSION,
    nodes: cfg.nodes,
    popupNodes: Array.isArray(cfg.popupNodes) ? cfg.popupNodes : [],
    customPresets: Array.isArray(cfg.customPresets) ? cfg.customPresets : [],
    settings: {
      popup: { ...defaults.popup, ...(cfg.settings?.popup ?? {}) },
    },
  };
}

async function isOverflow(): Promise<boolean> {
  const got = await browser.storage.local.get(OVERFLOW_KEY);
  return got[OVERFLOW_KEY] === true;
}

export async function loadConfig(): Promise<Config> {
  if (await isOverflow()) {
    const got = await browser.storage.local.get(CONFIG_KEY);
    return migrate(got[CONFIG_KEY]);
  }
  const got = await browser.storage.sync.get(CONFIG_KEY);
  return migrate(got[CONFIG_KEY]);
}

/** Persist config. Returns the area actually used. */
export async function saveConfig(config: Config): Promise<StorageArea> {
  const payload = { [CONFIG_KEY]: config };
  try {
    await browser.storage.sync.set(payload);
    // Success: clear any prior overflow state and mirror nothing in local.
    await browser.storage.local.remove([OVERFLOW_KEY, CONFIG_KEY]);
    return "sync";
  } catch {
    // Quota exceeded (or sync unavailable) → fall back to local.
    await browser.storage.local.set({
      ...payload,
      [OVERFLOW_KEY]: true,
    });
    return "local";
  }
}

/** Current persisted size estimate (bytes), for the options UI quota meter. */
export async function configByteSize(config: Config): Promise<number> {
  return new TextEncoder().encode(JSON.stringify({ [CONFIG_KEY]: config }))
    .length;
}

/** Subscribe to config changes from either area. Returns an unsubscribe fn. */
export function onConfigChanged(cb: (config: Config) => void): () => void {
  const listener = (
    changes: Record<string, browser.Storage.StorageChange>,
    _area: string,
  ) => {
    const change = changes[CONFIG_KEY];
    if (!change) return;
    // Ignore removals: clearing CONFIG_KEY in one area (e.g. the local cleanup
    // after a successful sync write) is NOT a config deletion — the real value
    // still lives in the other area. Treating undefined as empty would wipe
    // everything.
    if (change.newValue == null) return;
    cb(migrate(change.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
