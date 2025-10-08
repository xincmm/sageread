import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BookTag } from "@/pages/library/hooks/use-tags-management";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { useCallback, useEffect, useState } from "react";
import BookSelector from "./book-selector";

interface EditTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tag: BookTag | null;
  books: BookWithStatusAndUrls[];
  onBookUpdate: (bookId: string, updates: { tags?: string[] }) => Promise<boolean>;
  onRefreshBooks: () => Promise<void>;
}

export default function EditTagDialog({
  isOpen,
  onClose,
  tag,
  books,
  onBookUpdate,
  onRefreshBooks,
}: EditTagDialogProps) {
  const [selectedBooksForTag, setSelectedBooksForTag] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 当对话框打开时，设置当前选中的书籍
  useEffect(() => {
    if (isOpen && tag) {
      // 需要通过标签名称找到真实的标签ID
      const loadBooksWithTag = async () => {
        try {
          const tagName = tag.id.startsWith("tag-") ? tag.id.replace("tag-", "") : tag.name;
          const { getTagByName } = await import("@/services/tag-service");
          const dbTag = await getTagByName(tagName);
          const tagId = dbTag?.id;

          if (tagId) {
            const booksWithThisTag = books.filter((book) => book.tags?.includes(tagId));
            setSelectedBooksForTag(booksWithThisTag.map((book) => book.id));
          } else {
            setSelectedBooksForTag([]);
          }
        } catch (error) {
          console.error("Failed to load tag:", error);
          setSelectedBooksForTag([]);
        }
      };
      loadBooksWithTag();
    } else {
      setSelectedBooksForTag([]);
    }
  }, [isOpen, tag, books]);

  const handleCancel = useCallback(() => {
    setSelectedBooksForTag([]);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!tag) return;

    const tagName = tag.id.startsWith("tag-") ? tag.id.replace("tag-", "") : tag.name;

    try {
      setIsLoading(true);

      // 获取真实的标签ID
      const { getTagByName } = await import("@/services/tag-service");
      const dbTag = await getTagByName(tagName);
      const tagId = dbTag?.id;

      if (!tagId) {
        console.error("Tag not found:", tagName);
        setIsLoading(false);
        return;
      }

      // 为每本书更新标签状态
      for (const book of books) {
        const currentTags = book.tags || [];
        const hasTag = currentTags.includes(tagId);
        const shouldHaveTag = selectedBooksForTag.includes(book.id);

        if (hasTag !== shouldHaveTag) {
          let newTags: string[];
          if (shouldHaveTag) {
            // 添加标签（去重）
            newTags = Array.from(new Set([...currentTags, tagId]));
          } else {
            // 移除标签
            newTags = currentTags.filter((t) => t !== tagId);
          }
          await onBookUpdate(book.id, { tags: newTags });
        }
      }

      // 刷新数据
      await onRefreshBooks();
      handleCancel();
    } catch (error) {
      console.error("Failed to update tag books:", error);
      setIsLoading(false);
    }
  }, [tag, books, selectedBooksForTag, onBookUpdate, onRefreshBooks, handleCancel]);

  const toggleBookSelection = useCallback((bookId: string) => {
    setSelectedBooksForTag((prev) => (prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
  }, []);

  if (!tag) return null;

  const tagName = tag.id.startsWith("tag-") ? tag.id.replace("tag-", "") : tag.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>管理标签书籍：{tagName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-4">
          <BookSelector
            books={books}
            selectedBooks={selectedBooksForTag}
            onToggleBook={toggleBookSelection}
            disabled={isLoading}
            highlightTag={tagName}
            onBookUpdate={onBookUpdate}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "保存中..." : "保存更改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
