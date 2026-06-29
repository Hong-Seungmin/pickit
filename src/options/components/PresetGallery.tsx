import { useMemo } from "react";
import type { Preset } from "../../types";
import { BUILTIN_PRESETS, PRESET_CATEGORIES } from "../../presets";

export interface PresetGalleryProps {
  customPresets: Preset[];
  onAdd: (preset: Preset) => void;
  onDeleteCustom: (id: string) => void;
  onClose: () => void;
}

function PresetCard({
  preset,
  onAdd,
  onDelete,
}: {
  preset: Preset;
  onAdd: () => void;
  onDelete?: () => void;
}) {
  const kindLabel =
    preset.action.kind === "web-share" ? "공유 시트" : "URL 열기";
  return (
    <div className="preset">
      {preset.iconUrl ? (
        <img
          className="preset__icon"
          src={preset.iconUrl}
          alt=""
          onError={(e) => (e.currentTarget.style.visibility = "hidden")}
        />
      ) : (
        <span className="preset__icon preset__icon--ph" />
      )}
      <div className="preset__body">
        <div className="preset__name">{preset.name}</div>
        <div className="preset__meta">
          {kindLabel} · {preset.contexts.join(", ")}
        </div>
      </div>
      <div className="preset__actions">
        <button className="btn btn--sm btn--primary" onClick={onAdd}>
          메뉴에 추가
        </button>
        {onDelete && (
          <button className="btn btn--sm btn--danger" onClick={onDelete}>
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

export function PresetGallery({
  customPresets,
  onAdd,
  onDeleteCustom,
  onClose,
}: PresetGalleryProps) {
  const byCategory = useMemo(() => {
    const map = new Map<string, Preset[]>();
    for (const p of BUILTIN_PRESETS) {
      const list = map.get(p.category ?? "기타") ?? [];
      list.push(p);
      map.set(p.category ?? "기타", list);
    }
    return map;
  }, []);

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <h2>프리셋</h2>
          <button className="btn btn--sm" onClick={onClose}>
            닫기
          </button>
        </div>

        {customPresets.length > 0 && (
          <section className="preset-cat">
            <h3>내 프리셋</h3>
            <div className="preset-grid">
              {customPresets.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  onAdd={() => onAdd(p)}
                  onDelete={() => onDeleteCustom(p.id)}
                />
              ))}
            </div>
          </section>
        )}

        {PRESET_CATEGORIES.map((cat) => {
          const list = byCategory.get(cat);
          if (!list?.length) return null;
          return (
            <section key={cat} className="preset-cat">
              <h3>{cat}</h3>
              <div className="preset-grid">
                {list.map((p) => (
                  <PresetCard key={p.id} preset={p} onAdd={() => onAdd(p)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
