import type { Config, MenuNode, PickitContext } from "./types";
import { resolveTitle } from "./template";

// ---------------------------------------------------------------------------
// Context menu (re)builder
// ---------------------------------------------------------------------------
// Rebuilds the entire chrome.contextMenus tree from a Config. Called on
// install and whenever the stored config changes.
//
// Notes on the chrome.contextMenus API (verified behavior):
//  - create() returns its id synchronously; parents must be created before
//    children. We pass our node.id as the menu item id so onClicked can map
//    info.menuItemId back to a node.
//  - An item that has children automatically renders as a submenu, so a
//    "group" is just a parent item with no action.
//  - A parent's `contexts` must include the contexts of its children for the
//    submenu to appear, so groups use the union of descendant contexts.
// We use chrome.* directly here (not the polyfill) because create()'s
// synchronous id-return semantics are Chrome-specific; Firefox (browser.menus)
// is handled separately in a later phase.
// ---------------------------------------------------------------------------

const PICKIT_CONTEXT_TO_CHROME: Record<
  PickitContext,
  chrome.contextMenus.ContextType
> = {
  selection: "selection",
  image: "image",
  link: "link",
  page: "page",
};

function toChromeContexts(
  contexts: PickitContext[],
): chrome.contextMenus.ContextType[] {
  const mapped = contexts.map((c) => PICKIT_CONTEXT_TO_CHROME[c]);
  return mapped.length ? mapped : ["page"];
}

interface TreeNode {
  node: MenuNode;
  children: TreeNode[];
}

/** Build a parent→children tree from a flat node list, sorted by order. */
function buildTree(nodes: MenuNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const node of nodes) byId.set(node.id, { node, children: [] });

  const roots: TreeNode[] = [];
  for (const tn of byId.values()) {
    const parentId = tn.node.parentId;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(tn);
    else roots.push(tn);
  }

  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.node.order - b.node.order);
    for (const tn of list) sortRec(tn.children);
  };
  sortRec(roots);
  return roots;
}

/** Union of contexts across all enabled, renderable descendants of a group. */
function descendantContexts(tn: TreeNode): PickitContext[] {
  const set = new Set<PickitContext>();
  const walk = (t: TreeNode) => {
    for (const child of t.children) {
      if (!child.node.enabled) continue;
      if (child.node.type === "group") walk(child);
      else for (const c of child.node.contexts) set.add(c);
    }
  };
  walk(tn);
  return [...set];
}

/** True if this subtree has at least one renderable (enabled) item/separator. */
function hasVisibleContent(tn: TreeNode): boolean {
  return tn.children.some((c) => {
    if (!c.node.enabled) return false;
    if (c.node.type === "group") return hasVisibleContent(c);
    return true;
  });
}

function createNode(tn: TreeNode, parentMenuId?: string): void {
  const { node } = tn;
  if (!node.enabled) return;

  if (node.type === "separator") {
    chrome.contextMenus.create({
      id: node.id,
      type: "separator",
      contexts: toChromeContexts(node.contexts),
      ...(parentMenuId ? { parentId: parentMenuId } : {}),
    });
    return;
  }

  if (node.type === "group") {
    // Skip empty groups entirely — an empty submenu just renders as noise.
    if (!hasVisibleContent(tn)) return;
    chrome.contextMenus.create({
      id: node.id,
      title: resolveTitle(node.title, descendantContexts(tn)),
      contexts: toChromeContexts(descendantContexts(tn)),
      ...(parentMenuId ? { parentId: parentMenuId } : {}),
    });
    for (const child of tn.children) createNode(child, node.id);
    return;
  }

  // type === "item"
  chrome.contextMenus.create({
    id: node.id,
    title: resolveTitle(node.title, node.contexts),
    contexts: toChromeContexts(node.contexts),
    ...(parentMenuId ? { parentId: parentMenuId } : {}),
  });
}

export async function rebuildMenus(config: Config): Promise<void> {
  await chrome.contextMenus.removeAll();
  const roots = buildTree(config.nodes);
  for (const root of roots) createNode(root);
}
