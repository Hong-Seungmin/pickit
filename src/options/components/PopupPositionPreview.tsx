import type { MenuNode, PopupSettings } from "../../types";

// ---------------------------------------------------------------------------
// Visual preview of the floating toolbar: shows the trigger (with its text/
// background) AND the expanded item list, placed at the position computed from
// the chosen anchor + offsets, over a mock page with selected text + a pointer.
// ---------------------------------------------------------------------------

const BOX_W = 320;
const BOX_H = 210;
const TB_W = 30;
const TB_H = 30;

const SEL = { left: 60, top: 56, right: 184, bottom: 74 };
const POINTER = { x: 184, y: 74 };

function computePos(s: PopupSettings): { top: number; left: number } {
  let top = 0;
  let left = 0;
  switch (s.anchor) {
    case "selection-above":
      top = SEL.top - TB_H;
      left = SEL.left;
      break;
    case "selection-left":
      top = SEL.top;
      left = SEL.left - TB_W;
      break;
    case "selection-right":
      top = SEL.top;
      left = SEL.right;
      break;
    case "cursor":
      top = POINTER.y;
      left = POINTER.x;
      break;
    case "viewport-top-left":
      top = 0;
      left = 0;
      break;
    case "viewport-top-right":
      top = 0;
      left = BOX_W - TB_W;
      break;
    case "viewport-bottom-left":
      top = BOX_H - TB_H;
      left = 0;
      break;
    case "viewport-bottom-right":
      top = BOX_H - TB_H;
      left = BOX_W - TB_W;
      break;
    case "selection-below":
    default:
      top = SEL.bottom;
      left = SEL.left;
      break;
  }
  top += s.offsetY;
  left += s.offsetX;
  return {
    top: Math.max(0, Math.min(top, BOX_H - TB_H)),
    left: Math.max(0, Math.min(left, BOX_W - TB_W)),
  };
}

function label(title: string): string {
  return (
    title
      .replace(/\{selection\}/g, "선택한 텍스트")
      .replace(/\{(image|link|pageUrl|pageTitle)\}/g, "")
      .trim() || "항목"
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [31, 36, 48];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function PopupPositionPreview({
  settings,
  nodes,
}: {
  settings: PopupSettings;
  nodes: MenuNode[];
}) {
  const pos = computePos(settings);
  const glyph = settings.triggerText || "🧰";
  const opacity = settings.triggerBgOpacity ?? 100;
  const baseColor =
    settings.triggerBg && settings.triggerBg !== "transparent"
      ? settings.triggerBg
      : "#1f2430";
  const [r, g, b] = hexToRgb(baseColor);
  const bg = `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  const items = nodes
    .filter((n) => n.enabled && n.type === "item" && !!n.action)
    .sort((a, b) => a.order - b.order);
  const isShort = [...glyph].length <= 2;

  return (
    <div className="pos-preview">
      <div className="pos-preview__box" style={{ width: BOX_W, height: BOX_H }}>
        <div className="pp-line" style={{ top: 24, width: 240 }} />
        <div className="pp-line" style={{ top: 40, width: 270 }} />
        <div
          className="pp-sel"
          style={{
            top: SEL.top,
            left: SEL.left,
            width: SEL.right - SEL.left,
            height: SEL.bottom - SEL.top,
          }}
        />

        {/* actual toolbar: trigger + expanded list */}
        <div className="pp-tb" style={{ top: pos.top, left: pos.left }}>
          <div
            className="pp-trigger"
            style={{
              minWidth: TB_W,
              width: isShort ? TB_W : "auto",
              height: TB_H,
              background: bg,
              border: "none",
              boxShadow: opacity === 0 ? "none" : "0 4px 14px rgba(0,0,0,.4)",
              color: settings.triggerColor ?? "#e6e8ee",
              fontFamily: settings.triggerFontFamily || undefined,
              fontSize: `${settings.triggerFontSize ?? 18}px`,
              fontWeight: settings.triggerBold ? 700 : 400,
            }}
          >
            {settings.triggerIconUrl ? (
              <img src={settings.triggerIconUrl} alt="" />
            ) : (
              glyph
            )}
          </div>
          {items.length > 0 && (
            <div className="pp-list">
              {items.map((n) => (
                <div className="pp-li" key={n.id}>
                  {n.iconUrl ? <img src={n.iconUrl} alt="" /> : <span className="pp-dot" />}
                  <span className="pp-li__t">{label(n.title)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <svg
          className="pp-cursor"
          style={{ top: POINTER.y, left: POINTER.x }}
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <path
            d="M1 1 L1 12 L4 9 L6.5 14 L8.5 13 L6 8 L10 8 Z"
            fill="#111"
            stroke="#fff"
            strokeWidth="1"
          />
        </svg>
      </div>
      <p className="pos-preview__cap">
        파란 영역 = 선택 텍스트, 화살표 = 마우스 포인터. 실제 트리거와 펼친
        목록 모습입니다.
      </p>
    </div>
  );
}
