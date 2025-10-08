import { deleteTag, getTagByName } from "@/services/tag-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { Menu } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/window";
import { ask } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import type { BookTag } from "./use-tags-management";

interface UseTagsOperationsProps {
  booksWithStatus: BookWithStatusAndUrls[];
  handleBookUpdate: (bookId: string, updates: { tags?: string[] }) => Promise<boolean>;
  refreshBooks: () => Promise<void>;
  selectedTag: string;
  handleTagSelect: (tagId: string, onSearchClear?: () => void) => void;
  selectedTagsForDelete?: string[];
  tags: BookTag[];
  clearSelectedTags?: () => void;
}

export const useTagsOperations = ({
  booksWithStatus,
  handleBookUpdate,
  refreshBooks,
  selectedTag,
  handleTagSelect,
  selectedTagsForDelete = [],
  tags,
  clearSelectedTags,
}: UseTagsOperationsProps) => {
  const [editingTag, setEditingTag] = useState<BookTag | null>(null);

  // 批量删除标签
  const handleBatchDeleteTags = useCallback(async () => {
    if (selectedTagsForDelete.length === 0) return;

    try {
      const tagNames = selectedTagsForDelete.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag ? tag.name : tagId;
      });

      const confirmed = await ask(
        `确定要删除以下 ${selectedTagsForDelete.length} 个标签吗？\n\n${tagNames.join(", ")}\n\n这将从所有书籍中移除这些标签，并删除独立存储的标签。`,
        {
          title: "确认批量删除标签",
          kind: "warning",
        },
      );

      if (confirmed) {
        for (const tagId of selectedTagsForDelete) {
          try {
            // 获取标签名称
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) continue;

            const tagName = tag.id.startsWith("tag-") ? tag.id.replace("tag-", "") : tag.name;

            // 获取要删除的标签ID
            const tagToDelete = await getTagByName(tagName);
            const realTagId = tagToDelete?.id;

            if (realTagId) {
              // 遍历所有书籍，移除该标签ID
              const booksToUpdate = booksWithStatus.filter((book) => book.tags?.includes(realTagId));

              for (const book of booksToUpdate) {
                const newTags = book.tags!.filter((t) => t !== realTagId);
                await handleBookUpdate(book.id, { tags: newTags });
              }
            }

            // 删除独立存储的标签
            try {
              const independentTag = await getTagByName(tagName);
              if (independentTag) {
                await deleteTag(independentTag.id);
              }
            } catch (error) {
              console.warn("Failed to delete independent tag:", error);
            }
          } catch (error) {
            console.error(`Failed to delete tag ${tagId}:`, error);
          }
        }

        // 刷新数据
        await refreshBooks();

        // 如果当前选中的标签被删除了，切换到"全部"
        if (selectedTagsForDelete.includes(selectedTag)) {
          handleTagSelect("all");
        }

        // 清空多选状态
        if (clearSelectedTags) {
          clearSelectedTags();
        }
      }
    } catch (error) {
      console.error("Failed to batch delete tags:", error);
    }
  }, [
    selectedTagsForDelete,
    tags,
    booksWithStatus,
    handleBookUpdate,
    refreshBooks,
    selectedTag,
    handleTagSelect,
    clearSelectedTags,
  ]);

  const handleDeleteTag = useCallback(
    async (tag: BookTag) => {
      if (tag.id === "all" || tag.id === "uncategorized") {
        return; // 不允许删除特殊标签
      }

      const tagName = tag.id.startsWith("tag-") ? tag.id.replace("tag-", "") : tag.name;

      try {
        const confirmed = await ask(
          `确定要删除标签"${tagName}"吗？\n\n这将从所有书籍中移除此标签，并删除独立存储的标签。`,
          {
            title: "确认删除标签",
            kind: "warning",
          },
        );

        if (confirmed) {
          // 先获取要删除的标签ID
          const tagToDelete = await getTagByName(tagName);
          const tagId = tagToDelete?.id;

          if (tagId) {
            // 遍历所有书籍，移除该标签ID
            const booksToUpdate = booksWithStatus.filter((book) => book.tags?.includes(tagId));

            for (const book of booksToUpdate) {
              const newTags = book.tags!.filter((t) => t !== tagId);
              await handleBookUpdate(book.id, { tags: newTags });
            }
          }

          // 尝试删除独立存储的标签
          try {
            const independentTag = await getTagByName(tagName);
            if (independentTag) {
              await deleteTag(independentTag.id);
            }
          } catch (error) {
            console.warn("Failed to delete independent tag:", error);
          }

          // 刷新数据
          await refreshBooks();

          // 如果当前选中的是被删除的标签，切换到"全部"
          if (selectedTag === tag.id) {
            handleTagSelect("all");
          }
        }
      } catch (error) {
        console.error("Failed to delete tag:", error);
      }
    },
    [booksWithStatus, handleBookUpdate, refreshBooks, selectedTag, handleTagSelect],
  );

  const handleEditTag = useCallback((tag: BookTag) => {
    setEditingTag(tag);
  }, []);

  const handleEditTagCancel = useCallback(() => {
    setEditingTag(null);
  }, []);

  const handleTagContextMenu = useCallback(
    async (e: React.MouseEvent, tag: BookTag) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果有多选标签，显示批量删除菜单
      if (selectedTagsForDelete.length > 0) {
        // 检查是否所有选中的标签都可以删除
        const canDeleteAll = selectedTagsForDelete.every((tagId) => tagId !== "all" && tagId !== "uncategorized");

        if (!canDeleteAll) {
          return; // 如果包含不可删除的标签，不显示菜单
        }

        try {
          const menu = await Menu.new({
            items: [
              {
                id: "batch-delete-tags",
                text: `删除 ${selectedTagsForDelete.length} 个标签`,
                action: () => {
                  if (handleBatchDeleteTags) {
                    handleBatchDeleteTags();
                  }
                },
              },
            ],
          });

          await menu.popup(new LogicalPosition(e.clientX, e.clientY));
        } catch (error) {
          console.error("Failed to show batch delete menu:", error);
        }
        return;
      }

      // 单个标签的右键菜单
      // 不允许删除特殊标签
      if (tag.id === "all" || tag.id === "uncategorized") {
        return;
      }

      try {
        const menu = await Menu.new({
          items: [
            {
              id: "edit-tag",
              text: "管理书籍",
              action: () => {
                handleEditTag(tag);
              },
            },
            {
              id: "delete-tag",
              text: "删除标签",
              action: () => {
                handleDeleteTag(tag);
              },
            },
          ],
        });

        await menu.popup(new LogicalPosition(e.clientX, e.clientY));
      } catch (error) {
        console.error("Failed to show tag context menu:", error);
      }
    },
    [handleEditTag, handleDeleteTag, selectedTagsForDelete, handleBatchDeleteTags],
  );

  return {
    handleDeleteTag,
    handleEditTag,
    handleEditTagCancel,
    handleTagContextMenu,
    handleBatchDeleteTags,
    editingTag,
  };
};
