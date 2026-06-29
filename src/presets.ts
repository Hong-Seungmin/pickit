import { type MenuNode, type Preset, newId, presetToNode } from "./types";

// ---------------------------------------------------------------------------
// Built-in preset templates
// ---------------------------------------------------------------------------
// Only verified, currently-working endpoints are included. Emoji live directly
// in the title (they render in the real context menu as plain text). The image
// iconUrl is shown in the options UI, menu preview, and the in-page popup.
// ---------------------------------------------------------------------------

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/** Stable built-in presets, grouped by category for the gallery. */
export const BUILTIN_PRESETS: Preset[] = [
  // ---- 검색 Search ----
  {
    id: "builtin:google",
    name: "Google 검색",
    category: "검색",
    builtin: true,
    title: '🔍 Google: "{selection}"',
    iconUrl: favicon("google.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.google.com/search?q={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:youtube",
    name: "YouTube 검색",
    category: "검색",
    builtin: true,
    title: "▶️ YouTube: {selection}",
    iconUrl: favicon("youtube.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.youtube.com/results?search_query={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:bing",
    name: "Bing 검색",
    category: "검색",
    builtin: true,
    title: "Bing: {selection}",
    iconUrl: favicon("bing.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.bing.com/search?q={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:ddg",
    name: "DuckDuckGo 검색",
    category: "검색",
    builtin: true,
    title: "DuckDuckGo: {selection}",
    iconUrl: favicon("duckduckgo.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://duckduckgo.com/?q={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:naver",
    name: "네이버 검색",
    category: "검색",
    builtin: true,
    title: "네이버: {selection}",
    iconUrl: favicon("naver.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://search.naver.com/search.naver?query={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:wikipedia",
    name: "위키백과",
    category: "검색",
    builtin: true,
    title: "위키백과: {selection}",
    iconUrl: favicon("wikipedia.org"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://ko.wikipedia.org/w/index.php?search={selection}",
      openIn: "new-tab-fg",
    },
  },

  // ---- 지도 Maps ----
  {
    id: "builtin:gmaps",
    name: "Google 지도",
    category: "지도",
    builtin: true,
    title: "🗺️ Google 지도: {selection}",
    iconUrl: favicon("maps.google.com"),
    contexts: ["selection"],
    action: {
      // Official Google Maps URL scheme.
      kind: "url",
      urlTemplate:
        "https://www.google.com/maps/search/?api=1&query={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:navermap",
    name: "네이버 지도",
    category: "지도",
    builtin: true,
    title: "📍 네이버 지도: {selection}",
    iconUrl: favicon("naver.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://map.naver.com/p/search/{selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:kakaomap",
    name: "카카오맵",
    category: "지도",
    builtin: true,
    title: "📌 카카오맵: {selection}",
    iconUrl: favicon("map.kakao.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://map.kakao.com/?q={selection}",
      openIn: "new-tab-fg",
    },
  },

  // ---- 번역 Translate ----
  {
    id: "builtin:gtranslate",
    name: "Google 번역",
    category: "번역",
    builtin: true,
    title: "🌐 번역: {selection}",
    iconUrl: favicon("translate.google.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate:
        "https://translate.google.com/?sl=auto&tl=ko&op=translate&text={selection}",
      openIn: "new-tab-fg",
    },
  },

  // ---- 이미지 Image ----
  {
    id: "builtin:lens",
    name: "이미지 역검색 (Google Lens)",
    category: "이미지",
    builtin: true,
    title: "🖼️ 이미지 역검색",
    iconUrl: favicon("lens.google.com"),
    contexts: ["image"],
    action: {
      kind: "url",
      urlTemplate: "https://lens.google.com/uploadbyurl?url={image}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:gimages",
    name: "Google 이미지 검색",
    category: "이미지",
    builtin: true,
    title: "Google 이미지: {selection}",
    iconUrl: favicon("google.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.google.com/search?tbm=isch&q={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:bingimages",
    name: "Bing 이미지 검색",
    category: "이미지",
    builtin: true,
    title: "Bing 이미지: {selection}",
    iconUrl: favicon("bing.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.bing.com/images/search?q={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:naverimages",
    name: "네이버 이미지 검색",
    category: "이미지",
    builtin: true,
    title: "네이버 이미지: {selection}",
    iconUrl: favicon("naver.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate:
        "https://search.naver.com/search.naver?where=image&query={selection}",
      openIn: "new-tab-fg",
    },
  },

  // ---- AI ----
  {
    id: "builtin:chatgpt",
    name: "ChatGPT에 질문",
    category: "AI",
    builtin: true,
    title: "ChatGPT: {selection}",
    iconUrl: favicon("openai.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://chatgpt.com/?q={prompt}",
      openIn: "new-tab-fg",
      promptPrefix: "다음 내용을 한국어로 설명해줘:",
    },
  },
  {
    id: "builtin:claude",
    name: "Claude에 질문",
    category: "AI",
    builtin: true,
    title: "Claude: {selection}",
    iconUrl: favicon("claude.ai"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://claude.ai/new?q={prompt}",
      openIn: "new-tab-fg",
      promptPrefix: "다음 내용을 한국어로 설명해줘:",
    },
  },
  {
    id: "builtin:perplexity",
    name: "Perplexity에 질문",
    category: "AI",
    builtin: true,
    title: "Perplexity: {selection}",
    iconUrl: favicon("perplexity.ai"),
    contexts: ["selection"],
    action: {
      kind: "url",
      urlTemplate: "https://www.perplexity.ai/search?q={prompt}",
      openIn: "new-tab-fg",
      promptPrefix: "다음에 대해 알려줘:",
    },
  },
  {
    id: "builtin:gemini",
    name: "Gemini에 질문",
    category: "AI",
    builtin: true,
    title: "Gemini: {selection}",
    iconUrl: favicon("gemini.google.com"),
    contexts: ["selection"],
    action: {
      kind: "url",
      // Gemini의 URL prefill은 공식 보장되지 않음 — 앱만 열릴 수 있음.
      urlTemplate: "https://gemini.google.com/app?q={prompt}",
      openIn: "new-tab-fg",
      promptPrefix: "다음 내용을 한국어로 설명해줘:",
    },
  },

  // ---- 공유 Share (URL intents) ----
  {
    id: "builtin:share-x",
    name: "X (트위터) 공유",
    category: "공유",
    builtin: true,
    title: "🐦 X에 공유",
    iconUrl: favicon("x.com"),
    contexts: ["selection", "page"],
    action: {
      kind: "url",
      urlTemplate:
        "https://twitter.com/intent/tweet?text={selection}&url={pageUrl}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-facebook",
    name: "Facebook 공유",
    category: "공유",
    builtin: true,
    title: "📘 Facebook에 공유",
    iconUrl: favicon("facebook.com"),
    contexts: ["page"],
    action: {
      kind: "url",
      urlTemplate: "https://www.facebook.com/sharer/sharer.php?u={pageUrl}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-linkedin",
    name: "LinkedIn 공유",
    category: "공유",
    builtin: true,
    title: "💼 LinkedIn에 공유",
    iconUrl: favicon("linkedin.com"),
    contexts: ["page"],
    action: {
      kind: "url",
      urlTemplate:
        "https://www.linkedin.com/sharing/share-offsite/?url={pageUrl}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-reddit",
    name: "Reddit 공유",
    category: "공유",
    builtin: true,
    title: "👽 Reddit에 공유",
    iconUrl: favicon("reddit.com"),
    contexts: ["page"],
    action: {
      kind: "url",
      urlTemplate:
        "https://www.reddit.com/submit?url={pageUrl}&title={pageTitle}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-telegram",
    name: "Telegram 공유",
    category: "공유",
    builtin: true,
    title: "✈️ Telegram에 공유",
    iconUrl: favicon("telegram.org"),
    contexts: ["selection", "page"],
    action: {
      kind: "url",
      urlTemplate: "https://t.me/share/url?url={pageUrl}&text={selection}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-whatsapp",
    name: "WhatsApp 공유",
    category: "공유",
    builtin: true,
    title: "💬 WhatsApp으로 공유",
    iconUrl: favicon("whatsapp.com"),
    contexts: ["selection", "page"],
    action: {
      kind: "url",
      urlTemplate: "https://api.whatsapp.com/send?text={selection}%20{pageUrl}",
      openIn: "new-tab-fg",
    },
  },
  {
    id: "builtin:share-email",
    name: "이메일로 공유",
    category: "공유",
    builtin: true,
    title: "📧 이메일로 공유",
    iconUrl: favicon("gmail.com"),
    contexts: ["selection", "page"],
    action: {
      kind: "url",
      urlTemplate: "mailto:?subject={pageTitle}&body={selection}%0A{pageUrl}",
      openIn: "current",
    },
  },

  // ---- 공유 Share (OS / browser share sheet via Web Share API) ----
  {
    id: "builtin:share-os",
    name: "시스템 공유 (OS/모바일 공유 시트)",
    category: "공유",
    builtin: true,
    title: "📤 공유…",
    iconUrl: favicon("chrome.google.com"),
    contexts: ["selection", "page"],
    action: {
      kind: "web-share",
      urlTemplate: "",
      openIn: "new-tab-fg",
      shareTitle: "{pageTitle}",
      shareText: "{selection}",
      shareUrl: "{pageUrl}",
    },
  },
];

/** Distinct categories in display order. */
export const PRESET_CATEGORIES = [
  "검색",
  "지도",
  "번역",
  "이미지",
  "AI",
  "공유",
];

/** A handful of useful emojis for the editor's title-decoration picker. */
export const EMOJI_CHOICES = [
  "🔍", "🌐", "🗺️", "📍", "📌", "🖼️", "🔗", "📤", "📧", "💬",
  "🐦", "📘", "💼", "👽", "✈️", "▶️", "⭐", "❤️", "📋", "🔖",
  "📝", "🌎", "🛒", "📰", "🎬", "🎵", "💡", "🧰", "⚙️", "🚀",
];

function nodeFromPresetId(id: string, order: number, parentId?: string): MenuNode {
  const p = BUILTIN_PRESETS.find((x) => x.id === id)!;
  const n = presetToNode(p, order);
  if (parentId) n.parentId = parentId;
  return n;
}

/** First-run default CONTEXT MENU: presets organized into groups. */
export function buildDefaultMenu(): MenuNode[] {
  const out: MenuNode[] = [];
  let rootOrder = 0;
  const group = (title: string): string => {
    const id = newId();
    out.push({ id, type: "group", title, order: rootOrder++, contexts: [], enabled: true });
    return id;
  };
  const fill = (gid: string, ids: string[]) =>
    ids.forEach((pid, i) => out.push(nodeFromPresetId(pid, i, gid)));

  fill(group("🔍 검색"), ["builtin:google", "builtin:bing", "builtin:youtube", "builtin:wikipedia"]);
  fill(group("🗺️ 지도"), ["builtin:gmaps", "builtin:navermap", "builtin:kakaomap"]);
  fill(group("🖼️ 이미지"), ["builtin:lens", "builtin:gimages"]);
  fill(group("🤖 AI"), ["builtin:chatgpt", "builtin:claude", "builtin:perplexity", "builtin:gemini"]);
  fill(group("📤 공유"), ["builtin:share-os", "builtin:share-x", "builtin:share-facebook"]);
  out.push(nodeFromPresetId("builtin:gtranslate", rootOrder++));
  return out;
}

/** Starter set for the floating toolbar (selection-driven presets). */
const POPUP_STARTER_IDS = [
  "builtin:google",
  "builtin:gtranslate",
  "builtin:chatgpt",
  "builtin:navermap",
  "builtin:share-os",
];

export function buildPopupPresetNodes(startOrder = 0): MenuNode[] {
  return BUILTIN_PRESETS.filter((p) => POPUP_STARTER_IDS.includes(p.id)).map(
    (p, i) => presetToNode(p, startOrder + i),
  );
}

/** Snapshot an existing node into a reusable Preset (for "save as preset"). */
export function nodeToPreset(node: MenuNode, name: string): Preset {
  return {
    id: newId(),
    name,
    category: "내 프리셋",
    builtin: false,
    title: node.title,
    iconUrl: node.iconUrl,
    contexts: [...node.contexts],
    action: node.action
      ? { ...node.action }
      : { kind: "url", urlTemplate: "", openIn: "new-tab-fg" },
  };
}
