import type { TOCItem } from "@/lib/document";
import { getContentMd5 } from "@/utils/misc";
import clsx from "clsx";
import React, { useCallback } from "react";
import type { ListChildComponentProps } from "react-window";

const createExpanderIcon = (isExpanded: boolean) => {
  return (
    <svg
      viewBox="0 0 8 10"
      width="8"
      height="10"
      className={clsx("transform text-base-content transition-transform", isExpanded ? "rotate-90" : "rotate-0")}
      style={{ transformOrigin: "center" }}
      fill="currentColor"
    >
      <polygon points="0 0, 8 5, 0 10" />
    </svg>
  );
};

export interface FlatTOCItem {
  item: TOCItem;
  depth: number;
  index: number;
  isExpanded?: boolean;
}

const TOCItemView = React.memo<{
  bookId: string;
  flatItem: FlatTOCItem;
  itemSize?: number;
  isActive: boolean;
  onToggleExpand: (item: TOCItem) => void;
  onItemClick: (item: TOCItem) => void;
}>(({ flatItem, itemSize, isActive, onToggleExpand, onItemClick }) => {
  const { item, depth } = flatItem;

  const handleToggleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onToggleExpand(item);
    },
    [item, onToggleExpand],
  );

  const handleClickItem = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onItemClick(item);
    },
    [item, onItemClick],
  );

  return (
    <div
      role="treeitem"
      tabIndex={-1}
      onClick={item.href ? handleClickItem : undefined}
      aria-expanded={flatItem.isExpanded ? "true" : "false"}
      aria-selected={isActive ? "true" : "false"}
      data-href={item.href ? getContentMd5(item.href) : undefined}
      className={clsx(
        "my-0.5 flex w-full cursor-pointer items-center rounded-md py-2 font-medium",
        isActive ? "bg-muted" : "hover:bg-muted",
      )}
      style={{
        height: itemSize ? `${itemSize}px` : "auto",
        paddingInlineStart: `${(depth + 1) * 12}px`,
      }}
    >
      {item.subitems && (
        <div
          onClick={handleToggleExpand}
          className="inline-block cursor-pointer"
          style={{
            padding: "12px",
            margin: "-12px",
          }}
        >
          {createExpanderIcon(flatItem.isExpanded || false)}
        </div>
      )}
      <div
        className="ms-2 select-none truncate text-ellipsis text-sm"
        style={{
          maxWidth: "calc(100% - 24px)",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {item.label}
      </div>
      {item.location && (
        <div className="ms-auto ps-1 text-base-content/50 text-xs sm:pe-1">{item.location.current + 1}</div>
      )}
    </div>
  );
});

TOCItemView.displayName = "TOCItemView";

interface ListRowProps {
  bookId: string;
  flatItem: FlatTOCItem;
  itemSize?: number;
  activeHref: string | null;
  onToggleExpand: (item: TOCItem) => void;
  onItemClick: (item: TOCItem) => void;
}

export const StaticListRow: React.FC<ListRowProps> = ({
  bookId,
  flatItem,
  itemSize,
  activeHref,
  onToggleExpand,
  onItemClick,
}) => {
  const isActive = activeHref === flatItem.item.href;

  return (
    <div className={clsx("w-full border-base-300 border-b sm:border-none", "ps-2 pe-4 pt-[1px] sm:pe-2")}>
      <TOCItemView
        bookId={bookId}
        flatItem={flatItem}
        itemSize={itemSize}
        isActive={isActive}
        onToggleExpand={onToggleExpand}
        onItemClick={onItemClick}
      />
    </div>
  );
};

export const VirtualListRow: React.FC<
  ListChildComponentProps & {
    data: {
      bookId: string;
      flatItems: FlatTOCItem[];
      itemSize: number;
      activeHref: string | null;
      onToggleExpand: (item: TOCItem) => void;
      onItemClick: (item: TOCItem) => void;
    };
  }
> = ({ index, style, data }) => {
  const { flatItems, bookId, activeHref, itemSize, onToggleExpand, onItemClick } = data;
  const flatItem = flatItems[index];

  return (
    <div style={style}>
      <StaticListRow
        bookId={bookId}
        flatItem={flatItem}
        itemSize={itemSize - 1}
        activeHref={activeHref}
        onToggleExpand={onToggleExpand}
        onItemClick={onItemClick}
      />
    </div>
  );
};
