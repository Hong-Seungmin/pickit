import { mkdirSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Generates 1280x800 SVG store screenshots for Pickit, in two locales:
//   store/screenshots/ko/      (localized — Korean captions/labels)
//   store/screenshots/common/  (all-languages — English captions/labels)
// Convert SVG -> PNG before uploading (Chrome accepts PNG/JPEG only).
// ---------------------------------------------------------------------------

const W = 1280, H = 800;
const C = {
  bg: "#0b1020", panel: "#171a23", panel2: "#1f2430", border: "#2a3040",
  text: "#e6e8ee", muted: "#9aa3b2", brand: "#4f46e5", brand2: "#6366f1",
  sel: "rgba(79,109,245,.45)", white: "#ffffff", pageText: "#cfd3da",
};
const FONT = "'Malgun Gothic','Segoe UI',system-ui,sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function frame(title, bodyInner) {
  // a faux browser window
  return `
  <rect x="80" y="150" width="${W - 160}" height="${H - 230}" rx="14" fill="${C.panel}" stroke="${C.border}"/>
  <rect x="80" y="150" width="${W - 160}" height="44" rx="14" fill="${C.panel2}"/>
  <rect x="80" y="178" width="${W - 160}" height="16" fill="${C.panel2}"/>
  <circle cx="108" cy="172" r="6" fill="#ef5f5f"/><circle cx="128" cy="172" r="6" fill="#f6c150"/><circle cx="148" cy="172" r="6" fill="#56c264"/>
  <rect x="180" y="160" width="${W - 360}" height="24" rx="12" fill="#0f1320"/>
  <text x="200" y="177" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(title)}</text>
  ${bodyInner}`;
}

function caption(text) {
  return `
  <text x="${W / 2}" y="86" text-anchor="middle" font-family="${FONT}" font-size="40" font-weight="800" fill="${C.white}">${esc(text)}</text>`;
}

function item(x, y, w, glyph, label, hover) {
  return `
  <g transform="translate(${x},${y})">
    <rect width="${w}" height="34" rx="7" fill="${hover ? "#2b3040" : "transparent"}"/>
    <text x="12" y="22" font-family="${FONT}" font-size="15">${glyph}</text>
    <text x="38" y="22" font-family="${FONT}" font-size="14" fill="${C.text}">${esc(label)}</text>
  </g>`;
}

function bg() {
  return `<rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#141a33"/><stop offset="1" stop-color="#0b1020"/>
  </linearGradient></defs>`;
}

// --- Scene 1: floating toolbar over a page selection ----------------------
function scene1(t) {
  const body = `
  <text x="120" y="240" font-family="${FONT}" font-size="16" fill="${C.pageText}">${esc(t.article1)}</text>
  <rect x="120" y="258" width="430" height="22" rx="3" fill="${C.sel}"/>
  <text x="124" y="274" font-family="${FONT}" font-size="16" fill="${C.white}">${esc(t.selected)}</text>
  <text x="120" y="312" font-family="${FONT}" font-size="16" fill="${C.pageText}">${esc(t.article2)}</text>

  <!-- toolbar list -->
  <g transform="translate(124,300)">
    <rect width="248" height="${34 * 5 + 16}" rx="12" fill="${C.panel2}" stroke="${C.border}"/>
    ${item(8, 8, 232, "🔍", t.i_google, true)}
    ${item(8, 8 + 34, 232, "🌐", t.i_translate)}
    ${item(8, 8 + 68, 232, "🗺️", t.i_map)}
    ${item(8, 8 + 102, 232, "🤖", t.i_chatgpt)}
    ${item(8, 8 + 136, 232, "📤", t.i_share)}
  </g>`;
  return svg(caption(t.s1) + frame(t.url_article, body));
}

// --- Scene 2: right-click context menu with groups ------------------------
function scene2(t) {
  const row = (y, label, arrow) => `
    <rect x="8" y="${y}" width="244" height="30" rx="6" fill="${y === 8 ? "#e8f0fe" : "transparent"}"/>
    <text x="18" y="${y + 20}" font-family="${FONT}" font-size="14" fill="#202124">${esc(label)}</text>
    ${arrow ? `<text x="236" y="${y + 20}" font-family="${FONT}" font-size="13" fill="#5f6368">▸</text>` : ""}`;
  const menu = `
  <g transform="translate(360,260)">
    <rect width="260" height="232" rx="8" fill="#ffffff"/>
    ${row(8, t.g_search, true)}
    ${row(42, t.g_map, true)}
    ${row(76, t.g_image, true)}
    ${row(110, t.g_ai, true)}
    <rect x="12" y="146" width="236" height="1" fill="#e0e0e0"/>
    ${row(152, t.g_share, true)}
    ${row(186, t.i_translate, false)}
  </g>`;
  const body = `
  <text x="120" y="240" font-family="${FONT}" font-size="16" fill="${C.pageText}">${esc(t.rightclick_hint)}</text>
  ${menu}`;
  return svg(caption(t.s2) + frame(t.url_any, body));
}

// --- Scene 3: options manager + live preview ------------------------------
function scene3(t) {
  const listRow = (y, glyph, label, badge) => `
    <g transform="translate(0,${y})">
      <rect width="430" height="40" rx="8" fill="${C.panel}" stroke="${C.border}"/>
      <text x="14" y="26" font-family="${FONT}" font-size="14" fill="${C.muted}">⠿</text>
      <rect x="36" y="11" width="44" height="18" rx="5" fill="${C.panel2}"/>
      <text x="44" y="24" font-family="${FONT}" font-size="11" fill="#c4b5fd">${esc(badge)}</text>
      <text x="92" y="26" font-family="${FONT}" font-size="14" fill="${C.text}">${glyph} ${esc(label)}</text>
    </g>`;
  const tree = `
  <g transform="translate(120,250)">
    ${listRow(0, "🔍", t.g_search, t.b_group)}
    ${listRow(48, "🗺️", t.g_map, t.b_group)}
    ${listRow(96, "🤖", t.g_ai, t.b_group)}
    ${listRow(144, "📤", t.g_share, t.b_group)}
    ${listRow(192, "🌐", t.i_translate, t.b_item)}
  </g>`;
  const preview = `
  <g transform="translate(610,250)">
    <rect width="${W - 610 - 120}" height="252" rx="10" fill="${C.panel}" stroke="${C.border}"/>
    <text x="18" y="30" font-family="${FONT}" font-size="15" font-weight="700" fill="${C.text}">${esc(t.preview_title)}</text>
    <rect x="18" y="48" width="240" height="170" rx="8" fill="#fafafa"/>
    <g transform="translate(30,60)">
      <rect width="216" height="146" rx="6" fill="#ffffff"/>
      ${["🔍 "+t.i_google,"🌐 "+t.i_translate,"🤖 "+t.i_chatgpt,"📤 "+t.i_share].map((l,i)=>
        `<rect x="6" y="${6+i*34}" width="204" height="30" rx="6" fill="${i===0?"#e8f0fe":"transparent"}"/>
         <text x="16" y="${26+i*34}" font-family="${FONT}" font-size="13" fill="#202124">${esc(l)}</text>`).join("")}
    </g>
  </g>`;
  const tabs = `
  <g transform="translate(120,212)">
    <text x="0" y="14" font-family="${FONT}" font-size="14" font-weight="700" fill="${C.text}">${esc(t.tab_menu)}</text>
    <rect x="-4" y="24" width="${(t.tab_menu.length)*8+8}" height="3" fill="${C.brand}"/>
    <text x="${(t.tab_menu.length)*9+30}" y="14" font-family="${FONT}" font-size="14" fill="${C.muted}">${esc(t.tab_popup)}</text>
  </g>`;
  return svg(caption(t.s3) + frame(t.url_options, tabs + tree + preview));
}

// --- Scene 4: AI prompt + share panel -------------------------------------
function scene4(t) {
  const share = `
  <g transform="translate(700,250)">
    <rect width="380" height="250" rx="12" fill="${C.panel}" stroke="${C.border}"/>
    <text x="20" y="40" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.text}">${esc(t.share_title)}</text>
    <text x="20" y="74" font-family="${FONT}" font-size="12" fill="${C.muted}">${esc(t.f_title)}</text>
    <rect x="20" y="82" width="340" height="30" rx="7" fill="${C.panel2}" stroke="${C.border}"/>
    <text x="30" y="102" font-family="${FONT}" font-size="13" fill="${C.text}">${esc(t.sample_title)}</text>
    <text x="20" y="134" font-family="${FONT}" font-size="12" fill="${C.muted}">URL</text>
    <rect x="20" y="142" width="340" height="30" rx="7" fill="${C.panel2}" stroke="${C.border}"/>
    <text x="30" y="162" font-family="${FONT}" font-size="13" fill="${C.text}">https://example.com/article</text>
    <rect x="20" y="190" width="180" height="38" rx="8" fill="${C.brand}"/>
    <text x="110" y="214" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#fff">${esc(t.btn_share)}</text>
    <rect x="208" y="190" width="152" height="38" rx="8" fill="${C.panel2}" stroke="${C.border}"/>
    <text x="284" y="214" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${C.text}">${esc(t.btn_copy)}</text>
  </g>`;
  const ai = `
  <g transform="translate(120,250)">
    <rect width="520" height="250" rx="12" fill="${C.panel}" stroke="${C.border}"/>
    <text x="20" y="40" font-family="${FONT}" font-size="18" font-weight="700" fill="${C.text}">🤖 ${esc(t.ai_title)}</text>
    <text x="20" y="76" font-family="${FONT}" font-size="13" fill="${C.muted}">${esc(t.ai_prompt_label)}</text>
    <rect x="20" y="86" width="480" height="34" rx="7" fill="${C.panel2}" stroke="${C.border}"/>
    <text x="30" y="108" font-family="${FONT}" font-size="13" fill="${C.text}">${esc(t.ai_prompt)}</text>
    <text x="20" y="150" font-family="${FONT}" font-size="13" fill="${C.muted}">+ {selection}</text>
    <rect x="20" y="160" width="480" height="34" rx="7" fill="#0f1320"/>
    <text x="30" y="182" font-family="${FONT}" font-size="13" fill="${C.brand2}">https://chatgpt.com/?q=…</text>
    <text x="20" y="224" font-family="${FONT}" font-size="12" fill="${C.muted}">ChatGPT · Claude · Perplexity · Gemini</text>
  </g>`;
  return svg(caption(t.s4) + frame(t.url_options, ai + share));
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${bg()}
  ${inner}
  <text x="${W - 100}" y="${H - 28}" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="800" fill="${C.muted}">Pickit</text>
</svg>`;
}

const KO = {
  s1: "텍스트를 선택하는 순간 뜨는 플로팅 툴바",
  s2: "그룹으로 정리한 나만의 우클릭 메뉴",
  s3: "직관적 관리 화면과 실시간 미리보기",
  s4: "내 프롬프트로 AI 질의, 그리고 공유까지",
  url_article: "blog.example.com/article", url_any: "any-website.com",
  url_options: "Pickit — 옵션", article1: "관심 있는 문장을 드래그하면…",
  selected: "인공지능 반도체 시장 전망", article2: "원하는 동작을 바로 실행할 수 있습니다.",
  i_google: "Google 검색", i_translate: "번역", i_map: "네이버 지도",
  i_chatgpt: "ChatGPT에 질문", i_share: "공유…",
  g_search: "🔍 검색", g_map: "🗺️ 지도", g_image: "🖼️ 이미지", g_ai: "🤖 AI", g_share: "📤 공유",
  rightclick_hint: "선택 후 마우스 오른쪽 클릭 →", b_group: "그룹", b_item: "항목",
  preview_title: "메뉴 미리보기", tab_menu: "우클릭 컨텍스트 메뉴", tab_popup: "선택 플로팅 툴바",
  share_title: "공유", f_title: "제목", sample_title: "인공지능 반도체 시장 전망",
  btn_share: "시스템 공유 열기", btn_copy: "URL 복사",
  ai_title: "AI에 질문", ai_prompt_label: "내가 설정한 프롬프트", ai_prompt: "다음 내용을 한국어로 요약해줘:",
};

const EN = {
  s1: "A floating toolbar — the instant you select text",
  s2: "Your own right-click menu, organized in groups",
  s3: "A visual manager with live menu preview",
  s4: "Ask AI with your prompt — and share anywhere",
  url_article: "blog.example.com/article", url_any: "any-website.com",
  url_options: "Pickit — Options", article1: "Drag to select any phrase…",
  selected: "AI semiconductor market", article2: "…then run the action you want, instantly.",
  i_google: "Search Google", i_translate: "Translate", i_map: "Open in Maps",
  i_chatgpt: "Ask ChatGPT", i_share: "Share…",
  g_search: "🔍 Search", g_map: "🗺️ Maps", g_image: "🖼️ Images", g_ai: "🤖 AI", g_share: "📤 Share",
  rightclick_hint: "Select, then right-click →", b_group: "Group", b_item: "Item",
  preview_title: "Menu preview", tab_menu: "Right-click menu", tab_popup: "Selection toolbar",
  share_title: "Share", f_title: "Title", sample_title: "AI semiconductor market outlook",
  btn_share: "Open system share", btn_copy: "Copy URL",
  ai_title: "Ask AI", ai_prompt_label: "Your saved prompt", ai_prompt: "Summarize the following in English:",
};

for (const [dir, t] of [["ko", KO], ["common", EN]]) {
  const out = `C:/Users/smhong/claude_dev/pickit/store/screenshots/${dir}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/1-floating-toolbar.svg`, scene1(t));
  writeFileSync(`${out}/2-context-menu.svg`, scene2(t));
  writeFileSync(`${out}/3-options-preview.svg`, scene3(t));
  writeFileSync(`${out}/4-ai-share.svg`, scene4(t));
  console.log(`wrote 4 svgs -> ${out}`);
}
