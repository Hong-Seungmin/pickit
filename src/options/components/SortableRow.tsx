import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MenuNode, PickitContext } from "../../types";

const CONTEXT_LABEL: Record<PickitContext, string> = {
  selection: "선택 selection",
  image: "이미지 image",
  link: "링크 link",
  page: "페이지 page",
};

const TYPE_LABEL: Record<MenuNode["type"], string> = {
  item: "항목",
  group: "그룹",
  separator: "구분선",
};

export interface SortableRowProps {
  node: MenuNode;
  depth: number;
  ghost?: boolean;
  clone?: boolean;
  onEdit?: (node: MenuNode) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string) => void;
}

const INDENT = 24;

export function SortableRow({
  node,
  depth,
  ghost,
  clone,
  onEdit,
  onDelete,
  onToggle,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    paddingInlineStart: clone ? 0 : depth * INDENT,
  };

  const isSeparator = node.type === "separator";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "row",
        `row--${node.type}`,
        ghost ? "row--ghost" : "",
        clone ? "row--clone" : "",
        !node.enabled ? "row--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        className="row__handle"
        aria-label="drag"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span className={`badge badge--${node.type}`}>{TYPE_LABEL[node.type]}</span>

      {!isSeparator && node.iconUrl ? (
        <img
          className="row__icon"
          src={node.iconUrl}
          alt=""
          onError={(e) => (e.currentTarget.style.visibility = "hidden")}
        />
      ) : null}

      <span className="row__title">
        {isSeparator ? <em className="row__sep">———</em> : node.title || "(제목 없음)"}
      </span>

      {!isSeparator && (
        <span className="row__contexts">
          {node.contexts.map((c) => (
            <span key={c} className="chip" title={CONTEXT_LABEL[c]}>
              {c}
            </span>
          ))}
        </span>
      )}

      {!clone && (
        <span className="row__actions">
          <label className="switch" title="활성/비활성">
            <input
              type="checkbox"
              checked={node.enabled}
              onChange={() => onToggle?.(node.id)}
            />
            <span className="switch__track" />
          </label>
          {!isSeparator && (
            <button className="btn btn--sm" onClick={() => onEdit?.(node)}>
              편집
            </button>
          )}
          <button
            className="btn btn--sm btn--danger"
            onClick={() => onDelete?.(node.id)}
          >
            삭제
          </button>
        </span>
      )}
    </li>
  );
}
