import { getTags } from "@/services/tag-service";
import type { Tag } from "@/services/tag-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { useEffect, useMemo, useState } from "react";

export interface BookTag {
  id: string;
  name: string;
  count: number;
  color: string;
}

// 从数据库标签生成标签列表的函数
const generateTagsFromDatabase = async (books: BookWithStatusAndUrls[]): Promise<BookTag[]> => {
  const untaggedCount = books.filter((book) => !book.tags || book.tags.length === 0).length;
  let databaseTags: Tag[] = [];
  try {
    databaseTags = await getTags();
  } catch (error) {
    console.warn("Failed to fetch tags from database:", error);
  }

  const tags: BookTag[] = [{ id: "all", name: "全部", count: books.length, color: "#6b7280" }];

  // 如果有未分类的书籍，添加"未分类"分类到"全部"后面
  if (untaggedCount > 0) {
    tags.push({
      id: "uncategorized",
      name: "未分类",
      count: untaggedCount,
      color: "#6b7280",
    });
  }

  // 为每个数据库标签计算书籍数量
  const bookTags = databaseTags.map((tag) => {
    const count = books.filter((book) => book.tags?.includes(tag.id)).length;
    return {
      id: `tag-${tag.name}`,
      name: tag.name,
      count,
      color: tag.color || "#6b7280",
    };
  });

  // 按计数排序，空标签排在最后
  const sortedTags = bookTags.sort((a, b) => {
    if (a.count === 0 && b.count === 0) return a.name.localeCompare(b.name);
    if (a.count === 0) return 1;
    if (b.count === 0) return -1;
    return b.count - a.count;
  });

  tags.push(...sortedTags);

  return tags;
};

export const useTagsManagement = (booksWithStatus: BookWithStatusAndUrls[], selectedTag = "all") => {
  const [tags, setTags] = useState<BookTag[]>([]);
  const [databaseTags, setDatabaseTags] = useState<Tag[]>([]);

  // 从数据库获取标签并计算书籍数量
  useEffect(() => {
    const loadTags = async () => {
      const dbTags = await getTags();
      setDatabaseTags(dbTags);
      const generatedTags = await generateTagsFromDatabase(booksWithStatus);
      setTags(generatedTags);
    };
    loadTags();
  }, [booksWithStatus]);

  // 根据选中的标签过滤书籍 - 实现真正的标签筛选
  const filteredBooksByTag = useMemo(() => {
    if (selectedTag === "all") {
      return booksWithStatus;
    }

    if (selectedTag === "uncategorized") {
      return booksWithStatus.filter((book) => !book.tags || book.tags.length === 0);
    }

    if (selectedTag.startsWith("tag-")) {
      const tagName = selectedTag.replace("tag-", "");
      // 找到对应的标签ID
      const tagObj = databaseTags.find((tag) => tag.name === tagName);
      if (tagObj) {
        return booksWithStatus.filter((book) => book.tags?.includes(tagObj.id));
      }
      return [];
    }

    return booksWithStatus;
  }, [booksWithStatus, selectedTag, databaseTags]);

  // 移除自动切换逻辑，因为 selectedTag 现在由 URL 管理

  return {
    selectedTag,
    tags,
    filteredBooksByTag,
  };
};
