import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createTag } from "@/services/tag-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { useCallback, useEffect, useState } from "react";
import BookSelector from "./book-selector";

interface CreateTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookWithStatusAndUrls[];
  selectedTag: string;
  filteredBooksByTag: BookWithStatusAndUrls[];
  onBookUpdate: (
    bookId: string,
    updates: { title?: string; author?: string; coverPath?: string; tags?: string[] },
  ) => Promise<boolean>;
  onRefreshBooks: () => Promise<void>;
}

export default function CreateTagDialog({
  isOpen,
  onClose,
  books,
  selectedTag,
  filteredBooksByTag,
  onBookUpdate,
  onRefreshBooks,
}: CreateTagDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [selectedBooksForTag, setSelectedBooksForTag] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 当对话框打开时，设置默认选中的书籍
  useEffect(() => {
    if (isOpen) {
      setNewTagName("");
      // 默认选中当前标签下的所有书籍（如果不是"全部"标签）
      if (selectedTag !== "all") {
        const booksInTag = filteredBooksByTag.map((book) => book.id);
        setSelectedBooksForTag(booksInTag);
      } else {
        setSelectedBooksForTag([]);
      }
    }
  }, [isOpen, selectedTag, filteredBooksByTag]);

  const handleCancel = useCallback(() => {
    setNewTagName("");
    setSelectedBooksForTag([]);
    setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (!newTagName.trim()) return;

    try {
      setIsLoading(true);

      // 获取预定义颜色池
      const tagColors = [
        "#f59e0b",
        "#3b82f6",
        "#8b5cf6",
        "#10b981",
        "#ef4444",
        "#f97316",
        "#06b6d4",
        "#8b5a2b",
        "#ec4899",
        "#84cc16",
      ];
      const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];

      // 先创建标签到数据库（无论是否选择了书籍）
      try {
        await createTag({
          name: newTagName.trim(),
          color: randomColor,
        });
      } catch (error) {
        // 如果标签已存在，忽略错误
        console.warn("Tag already exists or creation failed:", error);
      }

      // 为选中的书籍添加标签
      for (const bookId of selectedBooksForTag) {
        const book = books.find((b) => b.id === bookId);
        if (book) {
          const currentTags = book.tags || [];
          const newTags = [...currentTags];

          // 如果标签不存在则添加
          if (!newTags.includes(newTagName.trim())) {
            newTags.push(newTagName.trim());
            await onBookUpdate(bookId, { tags: newTags });
          }
        }
      }

      // 刷新书籍列表
      await onRefreshBooks();
      handleCancel();
    } catch (error) {
      console.error("Failed to create new tag:", error);
      setIsLoading(false);
    }
  }, [newTagName, selectedBooksForTag, books, onBookUpdate, onRefreshBooks, handleCancel]);

  const toggleBookSelection = useCallback((bookId: string) => {
    setSelectedBooksForTag((prev) => (prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreate();
      }
    },
    [handleCreate],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建标签</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-4">
          <div className="space-y-2">
            <label className="block font-medium text-sm">标签名称</label>
            <Input
              type="text"
              placeholder="输入新标签名称..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <BookSelector
            books={books}
            selectedBooks={selectedBooksForTag}
            onToggleBook={toggleBookSelection}
            disabled={isLoading}
            onBookUpdate={onBookUpdate}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!newTagName.trim() || isLoading}>
            {isLoading ? "创建中..." : "创建标签"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
