import { getTags } from "@/services/tag-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface DataCleanupButtonProps {
  books: BookWithStatusAndUrls[];
  onBookUpdate: (bookId: string, updates: { tags?: string[] }) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export default function DataCleanupButton({ books, onBookUpdate, onRefresh }: DataCleanupButtonProps) {
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const handleDataCleanup = useCallback(async () => {
    if (isCleaningUp) return;

    try {
      setIsCleaningUp(true);
      toast.info("开始数据清理...");

      // 获取所有有效的标签ID
      const validTags = await getTags();
      const validTagIds = new Set(validTags.map((tag) => tag.id));

      let cleanupCount = 0;
      let removedTagsCount = 0;
      let emptyTagsCount = 0;

      // 遍历所有书籍
      for (const book of books) {
        if (!book.tags || book.tags.length === 0) {
          // 如果书籍没有标签或标签为空，确保设置为空数组
          if (book.tags === undefined) {
            await onBookUpdate(book.id, { tags: [] });
            emptyTagsCount++;
          }
          continue;
        }

        // 过滤出有效的标签ID
        const validBookTags = book.tags.filter((tagId) => validTagIds.has(tagId));
        const invalidTags = book.tags.filter((tagId) => !validTagIds.has(tagId));

        if (invalidTags.length > 0) {
          console.log(`清理书籍 "${book.title}": 移除 ${invalidTags.length} 个无效标签`, invalidTags);
          await onBookUpdate(book.id, { tags: validBookTags });
          cleanupCount++;
          removedTagsCount += invalidTags.length;
        }
      }

      // 刷新数据
      await onRefresh();

      // 显示清理结果
      if (cleanupCount > 0 || emptyTagsCount > 0) {
        toast.success(
          `数据清理完成！清理了 ${cleanupCount} 本书籍，移除了 ${removedTagsCount} 个无效标签，修复了 ${emptyTagsCount} 个空标签字段`,
        );
      } else {
        toast.success("数据检查完成，未发现需要清理的问题");
      }
    } catch (error) {
      console.error("数据清理失败:", error);
      toast.error("数据清理失败，请重试");
    } finally {
      setIsCleaningUp(false);
    }
  }, [books, onBookUpdate, onRefresh, isCleaningUp]);

  return (
    <button
      onClick={handleDataCleanup}
      disabled={isCleaningUp}
      className="flex items-center justify-center rounded-full p-1 text-neutral-600 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
      title="清理无效标签数据"
    >
      <Trash2 size={14} className={isCleaningUp ? "animate-pulse" : ""} />
    </button>
  );
}
