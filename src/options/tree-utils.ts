import type { MenuNode } from "../types";

// ---------------------------------------------------------------------------
// Flattened nested-sortable helpers (adapted from the dnd-kit sortable-tree
// example) with one Pickit-specific rule: only "group" nodes may be parents.
// ---------------------------------------------------------------------------

export interface FlatItem {
  node: MenuNode;
  depth: number;
  parentId: string | null;
}

interface TreeItem {
  node: MenuNode;
  children: TreeItem[];
}

function buildNested(nodes: MenuNode[]): TreeItem[] {
  const byId = new Map<string, TreeItem>();
  for (const node of nodes) byId.set(node.id, { node, children: [] });

  const roots: TreeItem[] = [];
  for (const item of byId.values()) {
    const parent = item.node.parentId
      ? byId.get(item.node.parentId)
      : undefined;
    if (parent) parent.children.push(item);
    else roots.push(item);
  }

  const sortRec = (list: TreeItem[]) => {
    list.sort((a, b) => a.node.order - b.node.order);
    for (const it of list) sortRec(it.children);
  };
  sortRec(roots);
  return roots;
}

export function flattenConfig(nodes: MenuNode[]): FlatItem[] {
  const roots = buildNested(nodes);
  const out: FlatItem[] = [];
  const walk = (items: TreeItem[], depth: number, parentId: string | null) => {
    for (const it of items) {
      out.push({ node: it.node, depth, parentId });
      walk(it.children, depth + 1, it.node.id);
    }
  };
  walk(roots, 0, null);
  return out;
}

/** Recompute parentId + per-sibling order from a flat list's encounter order. */
export function normalizeFromFlat(flat: FlatItem[]): MenuNode[] {
  const counter = new Map<string, number>();
  return flat.map((fi) => {
    const key = fi.parentId ?? "__root__";
    const order = counter.get(key) ?? 0;
    counter.set(key, order + 1);
    return {
      ...fi.node,
      parentId: fi.parentId ?? undefined,
      order,
    };
  });
}

/** Ids of all descendants of `id` (used to hide a dragged subtree). */
export function descendantIds(items: FlatItem[], id: string): string[] {
  const out: string[] = [];
  const collect = (parentId: string) => {
    for (const it of items) {
      if (it.parentId === parentId) {
        out.push(it.node.id);
        collect(it.node.id);
      }
    }
  };
  collect(id);
  return out;
}

export function removeChildrenOf(items: FlatItem[], ids: string[]): FlatItem[] {
  const exclude = new Set<string>();
  for (const id of ids) for (const d of descendantIds(items, id)) exclude.add(d);
  return items.filter((it) => !exclude.has(it.node.id));
}

export interface Projection {
  depth: number;
  parentId: string | null;
}

/** arrayMove without a dependency. */
export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

/**
 * Compute where the dragged item would land (depth + parent), honoring the
 * "groups only" parenting rule via maxDepth clamping.
 */
export function getProjection(
  items: FlatItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number,
): Projection {
  const overIndex = items.findIndex((i) => i.node.id === overId);
  const activeIndex = items.findIndex((i) => i.node.id === activeId);
  const activeItem = items[activeIndex];
  const newItems = arrayMove(items, activeIndex, overIndex);
  const previous = newItems[overIndex - 1];
  const next = newItems[overIndex + 1];

  const dragDepth = Math.round(dragOffset / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;

  // Only a group can gain a child, so cap the "deeper" move accordingly.
  const maxDepth = previous
    ? previous.node.type === "group"
      ? previous.depth + 1
      : previous.depth
    : 0;
  const minDepth = next ? next.depth : 0;

  let depth = projectedDepth;
  if (projectedDepth >= maxDepth) depth = maxDepth;
  else if (projectedDepth < minDepth) depth = minDepth;

  const parentId = (() => {
    if (depth === 0 || !previous) return null;
    if (depth === previous.depth) return previous.parentId;
    if (depth > previous.depth) return previous.node.id;
    const candidate = newItems
      .slice(0, overIndex)
      .reverse()
      .find((i) => i.depth === depth);
    return candidate?.parentId ?? null;
  })();

  return { depth, parentId };
}
