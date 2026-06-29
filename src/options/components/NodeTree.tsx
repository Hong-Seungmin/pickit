import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { MenuNode } from "../../types";
import {
  type FlatItem,
  type Projection,
  arrayMove,
  descendantIds,
  flattenConfig,
  getProjection,
  normalizeFromFlat,
  removeChildrenOf,
} from "../tree-utils";
import { SortableRow } from "./SortableRow";

const INDENT = 24;

export interface NodeTreeProps {
  nodes: MenuNode[];
  onChange: (nodes: MenuNode[]) => void;
  onEdit: (node: MenuNode) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function NodeTree({
  nodes,
  onChange,
  onEdit,
  onDelete,
  onToggle,
}: NodeTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const flat = useMemo(() => flattenConfig(nodes), [nodes]);

  // While dragging, hide the active node's descendants so the subtree moves
  // as a single unit.
  const visible = useMemo(() => {
    if (!activeId) return flat;
    const collapsed = descendantIds(flat, activeId);
    return removeChildrenOf(flat, [activeId]).filter(
      (i) => i.node.id !== undefined && !collapsed.includes(i.node.id),
    );
  }, [flat, activeId]);

  const projection: Projection | null = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(visible, activeId, overId, offsetLeft, INDENT);
  }, [activeId, overId, offsetLeft, visible]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = visible.map((i) => i.node.id);
  const activeItem: FlatItem | undefined = activeId
    ? flat.find((i) => i.node.id === activeId)
    : undefined;

  function handleStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setOverId(String(active.id));
  }

  function handleMove({ delta, over }: DragMoveEvent) {
    setOffsetLeft(delta.x);
    if (over) setOverId(String(over.id));
  }

  function handleEnd({ active, over }: DragEndEvent) {
    const projectedNow =
      over && activeId
        ? getProjection(visible, String(active.id), String(over.id), offsetLeft, INDENT)
        : null;
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);

    if (!over || !projectedNow) return;

    const clone = flattenConfig(nodes);
    const fromIndex = clone.findIndex((i) => i.node.id === active.id);
    const toIndex = clone.findIndex((i) => i.node.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    clone[fromIndex] = { ...clone[fromIndex], parentId: projectedNow.parentId };
    const moved = arrayMove(clone, fromIndex, toIndex);
    onChange(normalizeFromFlat(moved));
  }

  function handleCancel() {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  }

  if (flat.length === 0) {
    return (
      <p className="empty">
        아직 메뉴 항목이 없습니다. 위의 <b>항목 추가</b> 또는 <b>기본 프리셋
        추가</b>로 시작하세요.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleStart}
      onDragMove={handleMove}
      onDragEnd={handleEnd}
      onDragCancel={handleCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="tree">
          {visible.map((item) => {
            const depth =
              item.node.id === activeId && projection
                ? projection.depth
                : item.depth;
            return (
              <SortableRow
                key={item.node.id}
                node={item.node}
                depth={depth}
                ghost={item.node.id === activeId}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
              />
            );
          })}
        </ul>
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <ul className="tree tree--overlay">
            <SortableRow node={activeItem.node} depth={0} clone />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
