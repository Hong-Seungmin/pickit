import {
  POPUP_ANCHORS,
  TRIGGER_FONTS,
  type MenuNode,
  type PopupSettings,
} from "../../types";
import { NodeTree } from "./NodeTree";
import { PopupPositionPreview } from "./PopupPositionPreview";

const Z_MAX = 2147483647;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [31, 36, 48];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export interface PopupManagerProps {
  nodes: MenuNode[];
  settings: PopupSettings;
  onSettings: (patch: Partial<PopupSettings>) => void;
  onAdd: () => void;
  onOpenPresets: () => void;
  onChange: (nodes: MenuNode[]) => void;
  onEdit: (node: MenuNode) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function PopupManager({
  nodes,
  settings,
  onSettings,
  onAdd,
  onOpenPresets,
  onChange,
  onEdit,
  onDelete,
  onToggle,
}: PopupManagerProps) {
  const opacity = settings.triggerBgOpacity ?? 100;
  const base =
    settings.triggerBg && settings.triggerBg !== "transparent"
      ? settings.triggerBg
      : "#1f2430";
  const [r, g, b] = hexToRgb(base);
  const triggerRgba = `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  const zCustom = settings.zCustom ?? Z_MAX;

  return (
    <div className="popupmgr">
      <section className="card">
        <label className="check check--inline">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onSettings({ enabled: e.target.checked })}
          />
          <b>선택 플로팅 툴바 사용</b> — 텍스트를 선택하면 트리거 아이콘이
          나타나고, 클릭하면 목록이 펼쳐집니다.
        </label>

        <div className="card__cols">
          <div className="card__col">
            <h3>트리거 꾸미기</h3>
            <label className="field">
              <span>트리거 텍스트 (이모지 또는 글자)</span>
              <input
                value={settings.triggerText ?? ""}
                placeholder="🧰 또는 검색"
                onChange={(e) =>
                  onSettings({ triggerText: e.target.value || undefined })
                }
              />
              <small className="hint">
                이모지·기호·짧은 글자 모두 가능합니다.
              </small>
            </label>

            <label className="field">
              <span>트리거 배경 색상</span>
              <div className="bg-row">
                <input
                  type="color"
                  className="bg-color"
                  value={
                    settings.triggerBg && settings.triggerBg !== "transparent"
                      ? settings.triggerBg
                      : "#1f2430"
                  }
                  onChange={(e) => onSettings({ triggerBg: e.target.value })}
                  aria-label="배경 색상"
                />
                <span
                  className="bg-swatch"
                  style={{ background: triggerRgba }}
                />
              </div>
            </label>

            <label className="field">
              <span>배경 투명도 — {opacity}%</span>
              <div className="slider-row">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) =>
                    onSettings({ triggerBgOpacity: Number(e.target.value) })
                  }
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="slider-num"
                  value={opacity}
                  onChange={(e) =>
                    onSettings({
                      triggerBgOpacity: Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </div>
              <small className="hint">0% = 완전 투명.</small>
            </label>

            <label className="field">
              <span>트리거 폰트</span>
              <select
                value={settings.triggerFontFamily ?? ""}
                onChange={(e) =>
                  onSettings({ triggerFontFamily: e.target.value || undefined })
                }
              >
                {TRIGGER_FONTS.map((f) => (
                  <option key={f.label} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="offset-row">
              <label className="field">
                <span>글자 크기(px)</span>
                <input
                  type="number"
                  min={10}
                  max={40}
                  value={settings.triggerFontSize ?? 19}
                  onChange={(e) =>
                    onSettings({ triggerFontSize: Number(e.target.value) || 19 })
                  }
                />
              </label>
              <label className="field">
                <span>글자 색상</span>
                <input
                  type="color"
                  className="bg-color"
                  value={settings.triggerColor ?? "#e6e8ee"}
                  onChange={(e) => onSettings({ triggerColor: e.target.value })}
                />
              </label>
            </div>
            <label className="check check--inline">
              <input
                type="checkbox"
                checked={settings.triggerBold ?? false}
                onChange={(e) => onSettings({ triggerBold: e.target.checked })}
              />
              굵게 (bold)
            </label>

            <label className="field">
              <span>트리거 이미지 URL (선택)</span>
              <input
                value={settings.triggerIconUrl ?? ""}
                placeholder="https://example.com/icon.png"
                onChange={(e) =>
                  onSettings({ triggerIconUrl: e.target.value || undefined })
                }
              />
              <small className="hint">
                이미지를 지정하면 텍스트 대신 표시됩니다.
              </small>
            </label>

            <h3>위치</h3>
            <label className="field">
              <span>1차 — 기준점 (anchor)</span>
              <select
                value={settings.anchor}
                onChange={(e) =>
                  onSettings({ anchor: e.target.value as PopupSettings["anchor"] })
                }
              >
                {POPUP_ANCHORS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="offset-row">
              <label className="field">
                <span>2차 — 가로 간격 X(px)</span>
                <input
                  type="number"
                  value={settings.offsetX}
                  onChange={(e) =>
                    onSettings({ offsetX: Number(e.target.value) || 0 })
                  }
                />
              </label>
              <label className="field">
                <span>2차 — 세로 간격 Y(px)</span>
                <input
                  type="number"
                  value={settings.offsetY}
                  onChange={(e) =>
                    onSettings({ offsetY: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>

            <h3>겹침 순서</h3>
            <label className="field">
              <span>다른 오버레이와의 겹침 (z-index)</span>
              <select
                value={settings.zMode}
                onChange={(e) =>
                  onSettings({
                    zMode: e.target.value as PopupSettings["zMode"],
                  })
                }
              >
                <option value="top">최상위 (앞에 표시)</option>
                <option value="custom">사용자 지정</option>
                <option value="bottom">최하위 (뒤에 표시)</option>
              </select>
            </label>
            {settings.zMode === "custom" && (
              <label className="field">
                <span>z-index 값 — {zCustom.toLocaleString()}</span>
                <div className="slider-row">
                  <input
                    type="range"
                    min={0}
                    max={Z_MAX}
                    step={1000}
                    value={zCustom}
                    onChange={(e) =>
                      onSettings({ zCustom: Number(e.target.value) })
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    max={Z_MAX}
                    className="slider-num slider-num--wide"
                    value={zCustom}
                    onChange={(e) =>
                      onSettings({ zCustom: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <small className="hint">
                  슬라이더로 대략 조정, 입력란으로 정확히 지정.
                </small>
              </label>
            )}
          </div>

          <div className="card__col">
            <h3>예시 (실제 표시 모습)</h3>
            <PopupPositionPreview settings={settings} nodes={nodes} />
          </div>
        </div>
      </section>

      <div className="toolbar">
        <div className="toolbar__group">
          <button className="btn btn--primary" onClick={onAdd}>
            + 항목
          </button>
          <button className="btn" onClick={onOpenPresets}>
            프리셋…
          </button>
        </div>
        <span className="toolbar__hint">
          툴바 항목은 컨텍스트 메뉴와 별도로 관리됩니다. 드래그로 순서를 바꾸세요.
        </span>
      </div>

      <NodeTree
        nodes={nodes}
        onChange={onChange}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
      />
    </div>
  );
}
