import { useMemo, useState } from "react";
import {
  defaultAction,
  type MenuNode,
  type PopupSettings,
  type Preset,
  newId,
  presetToNode,
} from "../types";
import { nodeToPreset } from "../presets";
import { useConfig } from "./useConfig";
import { Toolbar } from "./components/Toolbar";
import { NodeTree } from "./components/NodeTree";
import { NodeEditor } from "./components/NodeEditor";
import { PresetGallery } from "./components/PresetGallery";
import { MenuPreview } from "./components/MenuPreview";
import { PopupManager } from "./components/PopupManager";

type Tab = "menu" | "popup";
type ListKey = "nodes" | "popupNodes";

function selfAndDescendants(nodes: MenuNode[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
        out.add(n.id);
        grew = true;
      }
    }
  }
  return out;
}

function nextRootOrder(nodes: MenuNode[]): number {
  const roots = nodes.filter((n) => !n.parentId);
  return roots.reduce((m, n) => Math.max(m, n.order + 1), 0);
}

export function App() {
  const { config, loading, area, byteSize, update } = useConfig();
  const [tab, setTab] = useState<Tab>("menu");
  const [editing, setEditing] = useState<{ node: MenuNode; list: ListKey } | null>(
    null,
  );
  const [presetTarget, setPresetTarget] = useState<ListKey | null>(null);

  const listKey: ListKey = tab === "menu" ? "nodes" : "popupNodes";

  const setList = (key: ListKey, nodes: MenuNode[]) =>
    update((prev) => ({ ...prev, [key]: nodes }));

  const setPopup = (patch: Partial<PopupSettings>) =>
    update((prev) => ({
      ...prev,
      settings: { ...prev.settings, popup: { ...prev.settings.popup, ...patch } },
    }));

  function handleAdd(key: ListKey, type: MenuNode["type"]) {
    const list = config[key];
    const base: MenuNode = {
      id: newId(),
      type,
      title: "",
      order: nextRootOrder(list),
      contexts:
        type === "item" ? ["selection"] : type === "group" ? [] : ["page"],
      enabled: true,
      ...(type === "item" ? { action: defaultAction() } : {}),
    };
    if (type === "separator") setList(key, [...list, base]);
    else setEditing({ node: base, list: key });
  }

  function handleSaveEditor(node: MenuNode, key: ListKey) {
    update((prev) => {
      const list = prev[key];
      const exists = list.some((n) => n.id === node.id);
      const next = exists
        ? list.map((n) => (n.id === node.id ? node : n))
        : [...list, node];
      return { ...prev, [key]: next };
    });
    setEditing(null);
  }

  function handleDelete(key: ListKey, id: string) {
    const list = config[key];
    const doomed = selfAndDescendants(list, id);
    if (
      doomed.size > 1 &&
      !confirm(`이 항목과 하위 ${doomed.size - 1}개를 함께 삭제합니다. 계속할까요?`)
    )
      return;
    setList(
      key,
      list.filter((n) => !doomed.has(n.id)),
    );
  }

  function handleToggle(key: ListKey, id: string) {
    setList(
      key,
      config[key].map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n,
      ),
    );
  }

  function handleAddPreset(preset: Preset) {
    const key = presetTarget ?? listKey;
    setList(key, [...config[key], presetToNode(preset, nextRootOrder(config[key]))]);
  }

  function handleSaveAsPreset(node: MenuNode) {
    const name = prompt("프리셋 이름", node.title || "내 프리셋");
    if (!name) return;
    update((prev) => ({
      ...prev,
      customPresets: [...prev.customPresets, nodeToPreset(node, name)],
    }));
  }

  function handleDeleteCustomPreset(id: string) {
    update((prev) => ({
      ...prev,
      customPresets: prev.customPresets.filter((p) => p.id !== id),
    }));
  }

  const groupOptions = useMemo(() => {
    if (!editing) return [];
    const list = config[editing.list];
    const blocked = selfAndDescendants(list, editing.node.id);
    return list.filter((n) => n.type === "group" && !blocked.has(n.id));
  }, [config, editing]);

  if (loading) return <div className="app">불러오는 중…</div>;

  return (
    <div className="app">
      <header className="app__header">
        <h1>Pickit</h1>
        <p className="app__sub">
          우클릭 컨텍스트 메뉴와 텍스트 선택 플로팅 툴바를 직접 구성하세요.
        </p>
        <p className="app__browsers">
          지원 브라우저: Chrome · Microsoft Edge · Brave · Opera 등 Chromium 기반
        </p>
      </header>

      <nav className="tabs">
        <button
          className={`tab${tab === "menu" ? " is-active" : ""}`}
          onClick={() => setTab("menu")}
        >
          우클릭 컨텍스트 메뉴
        </button>
        <button
          className={`tab${tab === "popup" ? " is-active" : ""}`}
          onClick={() => setTab("popup")}
        >
          선택 플로팅 툴바
        </button>
      </nav>

      {tab === "menu" ? (
        <>
          <Toolbar
            config={config}
            area={area}
            byteSize={byteSize}
            onAdd={(t) => handleAdd("nodes", t)}
            onOpenPresets={() => {
              setPresetTarget("nodes");
            }}
            onImport={(cfg) => void update(() => cfg)}
          />
          <div className="layout">
            <div className="layout__main">
              <NodeTree
                nodes={config.nodes}
                onChange={(nodes) => setList("nodes", nodes)}
                onEdit={(n) => setEditing({ node: n, list: "nodes" })}
                onDelete={(id) => handleDelete("nodes", id)}
                onToggle={(id) => handleToggle("nodes", id)}
              />
            </div>
            <MenuPreview nodes={config.nodes} />
          </div>
        </>
      ) : (
        <PopupManager
          nodes={config.popupNodes}
          settings={config.settings.popup}
          onSettings={setPopup}
          onAdd={() => handleAdd("popupNodes", "item")}
          onOpenPresets={() => setPresetTarget("popupNodes")}
          onChange={(nodes) => setList("popupNodes", nodes)}
          onEdit={(n) => setEditing({ node: n, list: "popupNodes" })}
          onDelete={(id) => handleDelete("popupNodes", id)}
          onToggle={(id) => handleToggle("popupNodes", id)}
        />
      )}

      {editing && (
        <NodeEditor
          node={editing.node}
          groups={groupOptions}
          popupMode={editing.list === "popupNodes"}
          onSave={(n) => handleSaveEditor(n, editing.list)}
          onCancel={() => setEditing(null)}
          onSaveAsPreset={handleSaveAsPreset}
        />
      )}

      {presetTarget && (
        <PresetGallery
          customPresets={config.customPresets}
          onAdd={handleAddPreset}
          onDeleteCustom={handleDeleteCustomPreset}
          onClose={() => setPresetTarget(null)}
        />
      )}
    </div>
  );
}
