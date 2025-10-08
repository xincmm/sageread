import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type Tag, getTags } from "@/services/tag-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BookSelectorProps {
  books: BookWithStatusAndUrls[];
  selectedBooks: string[];
  onToggleBook: (bookId: string) => void;
  disabled?: boolean;
  highlightTag?: string;
  onBookUpdate?: (bookId: string, updates: Partial<BookWithStatusAndUrls>) => Promise<boolean>;
}

export default function BookSelector({
  books,
  selectedBooks,
  onToggleBook,
  disabled = false,
  highlightTag,
  onBookUpdate,
}: BookSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [databaseTags, setDatabaseTags] = useState<Tag[]>([]);

  // 获取数据库标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await getTags();
        setDatabaseTags(tags);

        // 检查并清理无效的标签引用
        if (tags.length > 0) {
          cleanupInvalidTagReferences(tags);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };
    fetchTags();
  }, []);

  // 清理书籍中无效的标签引用
  const cleanupInvalidTagReferences = async (validTags: Tag[]) => {
    if (!onBookUpdate) {
      console.warn("Cannot cleanup invalid tags: onBookUpdate callback not provided");
      return;
    }

    const validTagIds = new Set(validTags.map((t) => t.id));
    let cleanupCount = 0;

    for (const book of books) {
      if (book.tags && book.tags.length > 0) {
        const validTags = book.tags.filter((tagId) => validTagIds.has(tagId));
        const invalidTags = book.tags.filter((tagId) => !validTagIds.has(tagId));

        if (invalidTags.length > 0) {
          console.log(`Cleaning up book "${book.title}": removing ${invalidTags.length} invalid tags`);
          try {
            await onBookUpdate(book.id, { tags: validTags });
            cleanupCount++;
          } catch (error) {
            console.error(`Failed to cleanup tags for book "${book.title}":`, error);
          }
        }
      }
    }

    if (cleanupCount > 0) {
      console.log(`Successfully cleaned up invalid tags from ${cleanupCount} books`);
    }
  };

  // 根据搜索词筛选书籍
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books;
    }

    const query = searchQuery.toLowerCase().trim();
    return books.filter((book) => {
      if (book.title.toLowerCase().includes(query)) return true;
      if (book.author.toLowerCase().includes(query)) return true;
      // 搜索标签名称而不是标签ID
      if (
        book.tags?.some((tagId) => {
          const tag = databaseTags.find((t) => t.id === tagId);
          const tagName = tag?.name || tagId;
          return tagName.toLowerCase().includes(query);
        })
      )
        return true;
      return false;
    });
  }, [books, searchQuery, databaseTags]);

  // 将标签ID转换为标签名称
  const getTagName = (tagId: string): string => {
    const tag = databaseTags.find((t) => t.id === tagId);

    if (!tag) {
      // 返回一个友好的提示，而不是显示长长的ID
      return "已删除的标签";
    }

    return tag.name;
  };

  return (
    <div className="space-y-2">
      <label className="block font-medium text-sm">
        选择书籍
        <span className="ml-2 inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 font-medium text-neutral-800 text-xs dark:bg-neutral-800 dark:text-neutral-200">
          {selectedBooks.length} 本已选择
        </span>
      </label>

      {/* 搜索框 */}
      <div className="relative">
        <Search
          className="-translate-y-1/2 absolute top-1/2 left-3 transform text-gray-500 dark:text-neutral-400"
          size={16}
        />
        <Input
          type="text"
          placeholder="搜索书籍..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border-neutral-200 bg-white pr-4 pl-9 shadow-none placeholder:text-neutral-500 focus-visible:ring-1 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-400"
          disabled={disabled}
        />
      </div>

      <div className="h-[calc(80vh-300px)] overflow-y-auto rounded-lg border p-2">
        {filteredBooks.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {filteredBooks.map((book) => (
              <div key={book.id} className="flex items-start space-x-3 p-2">
                <Checkbox
                  id={book.id}
                  checked={selectedBooks.includes(book.id)}
                  onCheckedChange={() => onToggleBook(book.id)}
                  className="mt-1"
                  disabled={disabled}
                />
                <label htmlFor={book.id} className="flex-1 cursor-pointer space-y-2">
                  <div className="flex items-center gap-2 text-neutral-900 text-sm dark:text-neutral-100">
                    <span>{book.title}</span>
                    {book.tags && book.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {book.tags.slice(0, 3).map((tagId) => {
                          const tagName = getTagName(tagId);
                          const isDeleted = tagName === "已删除的标签";
                          return (
                            <span
                              key={tagId}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                                isDeleted
                                  ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                  : highlightTag && tagName === highlightTag
                                    ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-800"
                                    : "bg-neutral-200 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-300"
                              }`}
                            >
                              {tagName}
                            </span>
                          );
                        })}
                        {book.tags.length > 3 && (
                          <span className="text-neutral-500 text-xs dark:text-neutral-400">
                            +{book.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="line-clamp-1 text-neutral-600 text-xs dark:text-neutral-400">{book.author}</div>
                </label>
              </div>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="flex h-[calc(80vh-300px)] items-center justify-center py-8 text-neutral-500 text-sm dark:text-neutral-400">
            没有找到匹配的书籍
          </div>
        ) : (
          <div className="flex h-[calc(80vh-300px)] items-center justify-center py-8 text-neutral-500 text-sm dark:text-neutral-400">
            没有可用的书籍
          </div>
        )}
      </div>
    </div>
  );
}
