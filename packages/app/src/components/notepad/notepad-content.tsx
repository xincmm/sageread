import { useReaderStore } from "@/store/reader-store";
import { useEffect, useRef } from "react";
import { AnnotationItem } from "./annotation-item";
import { useAnnotations, useNotepad } from "./hooks";
import { NoteItem } from "./note-item";
import type { NotepadTab } from "./notepad-container";

interface NotepadContentProps {
  activeTab: NotepadTab;
  bookId: string;
}

export const NotepadContent = ({ activeTab, bookId }: NotepadContentProps) => {
  const { notesData, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } = useNotepad({
    bookId,
  });

  const { annotations, status: annotationStatus, handleDeleteAnnotation } = useAnnotations({ bookId });

  const { activeBook } = useReaderStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 使用 Intersection Observer 实现无限滚动
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasData = notesData?.pages.some((page) => page.data.length > 0);

  return (
    <div className="mt-1 h-full overflow-y-auto">
      <div className="space-y-3 p-1">
        {activeTab === "notes" && (
          <div>
            {status === "pending" ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
              </div>
            ) : status === "error" ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                <p>加载笔记失败: {error?.message}</p>
              </div>
            ) : (
              <>
                {notesData?.pages.map((group, i) => (
                  <div key={i} className="space-y-2">
                    {group.data.map((note) => (
                      <NoteItem key={note.id} note={note} />
                    ))}
                  </div>
                ))}

                {/* 无限滚动触发器 */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex items-center justify-center py-4">
                    {isFetchingNextPage && (
                      <div className="h-4 w-4 animate-spin rounded-full border border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
                    )}
                  </div>
                )}

                {/* 没有更多数据的提示 */}
                {/* {!hasNextPage && hasData && (
                  <div className="flex items-center justify-center py-4 text-neutral-400 text-xs">
                    <p>没有更多了</p>
                  </div>
                )} */}

                {/* 空状态提示 */}
                {!hasNextPage && !hasData && (
                  <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                    <p>还没有笔记，选中文本创建第一个笔记吧！</p>
                  </div>
                )}

                {isFetching && !isFetchingNextPage && (
                  <div className="flex items-center justify-center py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === "annotations" && (
          <div>
            {annotationStatus === "pending" ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
              </div>
            ) : annotationStatus === "error" ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                <p>加载标注失败</p>
              </div>
            ) : annotations.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                <p>还没有标注，选中文本并高亮创建第一个标注吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {annotations.map((annotation) => (
                  <AnnotationItem
                    key={annotation.id}
                    annotation={annotation}
                    bookId={bookId}
                    bookTitle={activeBook?.title}
                    onDelete={handleDeleteAnnotation}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
