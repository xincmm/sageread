import type { BookWithStatusAndUrls } from "@/types/simple-book";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookTag } from "../hooks/use-tags-management";
// import DataCleanupButton from "./DataCleanupButton";

interface TagListProps {
  tags: BookTag[];
  selectedTag: string;
  selectedTagsForDelete: string[];
  handleTagClick: (tagId: string, event: React.MouseEvent) => void;
  handleTagContextMenu: (e: React.MouseEvent, tag: BookTag) => void;
  handleNewTagClick: () => void;
  books: BookWithStatusAndUrls[];
  onBookUpdate: (bookId: string, updates: { tags?: string[] }) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export default function TagList({
  tags,
  selectedTag,
  selectedTagsForDelete,
  handleTagClick,
  handleTagContextMenu,
  handleNewTagClick,
  // books,
  // onBookUpdate,
  // onRefresh,
}: TagListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(false);

  const checkScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const tolerance = 1; // 1px 容错范围

    // 检测是否在顶部（滚动位置大于容错范围时显示顶部阴影）
    setShowTopShadow(scrollTop > tolerance);

    // 底部阴影只在顶部且有内容可滚动时显示（提示用户可以向下滚动）
    setShowBottomShadow(scrollTop <= tolerance && scrollHeight > clientHeight);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 初始状态检测
    checkScrollState();

    // 添加滚动事件监听
    container.addEventListener("scroll", checkScrollState, { passive: true });

    // 清理事件监听
    return () => container.removeEventListener("scroll", checkScrollState);
  }, [checkScrollState]);

  // 当标签数量变化时，重新检测滚动状态
  useEffect(() => {
    if (tags.length > 6) {
      // 使用 setTimeout 确保DOM更新完成后再检测
      setTimeout(checkScrollState, 0);
    }
  }, [tags.length, checkScrollState]);

  const renderTagButton = useCallback(
    (tag: BookTag) => {
      const isSelected = selectedTagsForDelete.includes(tag.id);

      return (
        <button
          key={tag.id}
          onClick={(e) => handleTagClick(tag.id, e)}
          onContextMenu={(e) => handleTagContextMenu(e, tag)}
          className={clsx(
            "flex w-full select-none items-center justify-between rounded-md px-2 py-1 pr-3 text-left text-sm transition-colors hover:bg-border",
            isSelected
              ? "bg-muted"
              : selectedTag === tag.id
                ? "font-bold text-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            <span>{tag.name}</span>
          </div>
          <span className="font-normal text-neutral-500 text-xs dark:text-neutral-400">{tag.count}</span>
        </button>
      );
    },
    [selectedTag, selectedTagsForDelete, handleTagClick, handleTagContextMenu],
  );

  return (
    <div className="mt-1 ml-0 space-y-1">
      <div className="mb-1 flex items-center justify-between px-1 font-normal text-neutral-600 text-xs uppercase tracking-wide dark:text-neutral-400">
        <span>标签</span>
        <div className="flex items-center gap-1">
          {/* <DataCleanupButton books={books} onBookUpdate={onBookUpdate} onRefresh={onRefresh} /> */}
          <button
            className="flex items-center justify-center rounded-full p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-600 dark:hover:text-neutral-300"
            onClick={handleNewTagClick}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {tags.length > 6 ? (
        <div
          ref={scrollContainerRef}
          className="relative max-h-60 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            className={clsx(
              "pointer-events-none sticky top-[-4px] z-10 h-6 transition-opacity duration-200",
              // Softer scroll shadow to match frosted background
              "bg-gradient-to-b from-neutral-50/95 via-neutral-50/70 to-transparent dark:from-neutral-800/90 dark:via-neutral-800/60 dark:to-transparent",
              showTopShadow ? "opacity-0" : "opacity-0",
            )}
          />

          <div className="-mt-6 space-y-1">{tags.map(renderTagButton)}</div>

          <div
            className={clsx(
              "-mb-6 pointer-events-none sticky bottom-0 z-10 h-6 transition-opacity duration-200",
              "bg-gradient-to-t from-neutral-50/95 via-neutral-50/70 to-transparent dark:from-neutral-800/90 dark:via-neutral-800/60 dark:to-transparent",
              showBottomShadow ? "opacity-0" : "opacity-0",
            )}
          />
        </div>
      ) : (
        <div className="space-y-1 px-1">{tags.map(renderTagButton)}</div>
      )}
    </div>
  );
}
