import { useRef } from "react";
import type { MenuNode } from "../../types";
import type { StorageArea } from "../../storage";
import { exportConfig, parseConfig } from "../io";
import type { Config } from "../../types";

// chrome.storage.sync hard cap is ~102,400 bytes total.
const SYNC_QUOTA = 102_400;

export interface ToolbarProps {
  config: Config;
  area: StorageArea;
  byteSize: number;
  onAdd: (type: MenuNode["type"]) => void;
  onOpenPresets: () => void;
  onImport: (config: Config) => void;
}

export function Toolbar({
  config,
  area,
  byteSize,
  onAdd,
  onOpenPresets,
  onImport,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = Math.min(100, Math.round((byteSize / SYNC_QUOTA) * 100));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    try {
      const cfg = parseConfig(await file.text());
      if (
        confirm(
          `가져오기를 진행하면 현재 ${config.nodes.length}개 항목이 ${cfg.nodes.length}개로 교체됩니다. 계속할까요?`,
        )
      ) {
        onImport(cfg);
      }
    } catch (err) {
      alert(`가져오기 실패: ${(err as Error).message}`);
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button className="btn btn--primary" onClick={() => onAdd("item")}>
          + 항목
        </button>
        <button className="btn" onClick={() => onAdd("group")}>
          + 그룹
        </button>
        <button className="btn" onClick={() => onAdd("separator")}>
          + 구분선
        </button>
        <button className="btn" onClick={onOpenPresets}>
          프리셋…
        </button>
      </div>

      <div className="toolbar__group">
        <button className="btn" onClick={() => exportConfig(config)}>
          내보내기 (JSON)
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          가져오기 (JSON)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleFile}
        />
      </div>

      <div className="toolbar__meter" title={`${byteSize} bytes / ${SYNC_QUOTA}`}>
        <span className="toolbar__area" data-area={area}>
          {area === "sync" ? "sync 저장" : "local 저장(초과분)"}
        </span>
        <span className="meter">
          <span className="meter__fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="toolbar__pct">{pct}%</span>
      </div>
    </div>
  );
}
