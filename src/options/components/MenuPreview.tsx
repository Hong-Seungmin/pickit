import { useMemo, useState } from "react";
import { ALL_CONTEXTS, type MenuNode, type PickitContext } from "../../types";

const CONTEXT_LABEL: Record<PickitContext, string> = {
  selection: "텍스트 선택",
  image: "이미지",
  link: "링크",
  page: "페이지",
};

// Friendly sample values so the preview reads naturally.
const SAMPLE: Record<string, string> = {
  "{selection}": "선택한 텍스트",
  "{image}": "이미지URL",
  "{link}": "링크URL",
  "{pageUrl}": "페이지URL",
  "{pageTitle}": "페이지 제목",
};

function previewTitle(title: string): string {
  return title.replace(
    /\{(selection|image|link|pageUrl|pageTitle)\}/g,
    (m) => SAMPLE[m] ?? m,
  );
}

interface TreeItem {
  node: MenuNode;
  children: TreeItem[];
}

function buildTree(nodes: MenuNode[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  for (const n of nodes) byId.set(n.id, { node: n, children: [] });
  const roots: TreeItem[] = [];
  for (const it of byId.values()) {
    const parent = it.node.parentId ? byId.get(it.node.parentId) : undefined;
    if (parent) parent.children.push(it);
    else roots.push(it);
  }
  const sort = (list: TreeItem[]) => {
    list.sort((a, b) => a.node.order - b.node.order);
    list.forEach((i) => sort(i.children));
  };
  sort(roots);
  return roots;
}

function visibleFor(item: TreeItem, ctx: PickitContext): boolean {
  if (!item.node.enabled) return false;
  if (item.node.type === "group")
    return item.children.some((c) => visibleFor(c, ctx));
  return item.node.contexts.includes(ctx);
}

function Glyph({ node }: { node: MenuNode }) {
  if (node.iconUrl) {
    return (
      <img
        className="ctxmenu__icon"
        src={node.iconUrl}
        alt=""
        onError={(e) => (e.currentTarget.style.visibility = "hidden")}
      />
    );
  }
  return <span className="ctxmenu__icon" />;
}

function MenuLevel({ items, ctx }: { items: TreeItem[]; ctx: PickitContext }) {
  const shown = items.filter((i) => visibleFor(i, ctx));
  if (shown.length === 0) return null;
  return (
    <ul className="ctxmenu">
      {shown.map((item) => {
        if (item.node.type === "separator") {
          return <li key={item.node.id} className="ctxmenu__sep" />;
        }
        if (item.node.type === "group") {
          return (
            <li
              key={item.node.id}
              className="ctxmenu__item ctxmenu__item--group"
            >
              <span className="ctxmenu__row">
                <Glyph node={item.node} />
                <span className="ctxmenu__label">
                  {previewTitle(item.node.title) || "(그룹)"}
                </span>
                <span className="ctxmenu__caret">▸</span>
              </span>
              <div className="ctxmenu__sub">
                <MenuLevel items={item.children} ctx={ctx} />
              </div>
            </li>
          );
        }
        return (
          <li key={item.node.id} className="ctxmenu__item">
            <span className="ctxmenu__row">
              <Glyph node={item.node} />
              <span className="ctxmenu__label">
                {previewTitle(item.node.title) || "(제목 없음)"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MenuPreview({ nodes }: { nodes: MenuNode[] }) {
  const [ctx, setCtx] = useState<PickitContext>("selection");
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const anyVisible = tree.some((i) => visibleFor(i, ctx));

  return (
    <aside className="preview">
      <div className="preview__head">
        <h2>메뉴 미리보기</h2>
        <select
          value={ctx}
          onChange={(e) => setCtx(e.target.value as PickitContext)}
          aria-label="미리보기 컨텍스트"
        >
          {ALL_CONTEXTS.map((c) => (
            <option key={c} value={c}>
              {CONTEXT_LABEL[c]} 우클릭
            </option>
          ))}
        </select>
      </div>

      <p className="preview__note">
        우클릭 메뉴에서 항목이 어떻게 보일지의 미리보기입니다. 좌측에서 드래그로
        순서를 바꾸면 즉시 반영됩니다.
      </p>

      <div className="preview__canvas">
        {anyVisible ? (
          <MenuLevel items={tree} ctx={ctx} />
        ) : (
          <p className="preview__empty">
            이 컨텍스트에서 표시될 항목이 없습니다.
          </p>
        )}
      </div>
    </aside>
  );
}
