import type { PickitContext } from "./types";

// ---------------------------------------------------------------------------
// URL template substitution engine
// ---------------------------------------------------------------------------
// Supported placeholders (resolved at click time from OnClickData + Tab):
//   {selection}  info.selectionText  — encodeURIComponent applied
//   {image}      info.srcUrl         — encodeURIComponent applied
//   {link}       info.linkUrl        — encodeURIComponent applied
//   {pageUrl}    info.pageUrl        — encodeURIComponent applied
//   {pageTitle}  tab.title           — encodeURIComponent applied
//
// All values are URL-encoded because templates put them in query strings.
// ---------------------------------------------------------------------------

export interface TemplateValues {
  selection?: string;
  image?: string;
  link?: string;
  pageUrl?: string;
  pageTitle?: string;
  /** promptPrefix + selection, for AI sites. */
  prompt?: string;
}

const PLACEHOLDER_RE = /\{(selection|image|link|pageUrl|pageTitle|prompt)\}/g;

export function resolveTemplate(
  template: string,
  values: TemplateValues,
): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const raw = (values as Record<string, string | undefined>)[key];
    return raw == null ? "" : encodeURIComponent(raw);
  });
}

/** Like resolveTemplate but without URL-encoding — for plain-text targets such
 *  as navigator.share() fields. */
export function resolveTemplateRaw(
  template: string,
  values: TemplateValues,
): string {
  return template.replace(PLACEHOLDER_RE, (_match, key: string) => {
    const raw = (values as Record<string, string | undefined>)[key];
    return raw == null ? "" : raw;
  });
}

/** Build TemplateValues from a contextMenus click payload. */
export function valuesFromClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): TemplateValues {
  return {
    selection: info.selectionText,
    image: info.srcUrl,
    link: info.linkUrl,
    pageUrl: info.pageUrl,
    pageTitle: tab?.title,
  };
}

// ---------------------------------------------------------------------------
// Title placeholders
// ---------------------------------------------------------------------------
// chrome.contextMenus titles are static at creation time. The ONLY value the
// browser can substitute live is the current selection, via the literal "%s"
// token (selection context only). So:
//   {selection} in a title  → "%s"  (Chrome substitutes at display time)
//   other placeholders      → stripped (browser cannot resolve them live)
// Literal "%" in a title must be escaped as "%%" for Chrome.
// ---------------------------------------------------------------------------

export function resolveTitle(
  title: string,
  contexts: PickitContext[],
): string {
  // Escape pre-existing % so Chrome doesn't misread it, then inject %s.
  const escaped = title.replace(/%/g, "%%");
  const supportsSelection = contexts.includes("selection");
  return escaped.replace(PLACEHOLDER_RE, (_match, key: string) => {
    if (key === "selection" && supportsSelection) return "%s";
    return ""; // not resolvable live in a title
  });
}
