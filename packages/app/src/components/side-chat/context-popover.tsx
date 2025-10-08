import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBooks, searchBooks } from "@/services/book-service";
import type { SimpleBook } from "@/types/simple-book";
import { useQuery } from "@tanstack/react-query";
import { AtSign, BookOpen, Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ContextPopoverProps {
  activeBookId: string | undefined;
  setActiveBookId: (bookId: string | undefined) => void;
}

export function ContextPopover({ activeBookId, setActiveBookId }: ContextPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: books = [],
    error,
    isLoading,
  } = useQuery({
    queryKey: ["books", debouncedSearchQuery],
    queryFn: async () => {
      if (debouncedSearchQuery.trim()) {
        return await searchBooks(debouncedSearchQuery.trim());
      }
      return await getBooks();
    },
  });

  const handleSelectBook = (bookId: string) => {
    setActiveBookId(bookId);
    setOpen(false);
  };

  const handleRemoveBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveBookId(undefined);
  };

  const activeBook = useMemo(() => {
    if (!activeBookId || !books.length) return null;
    return books.find((book) => book.id === activeBookId) || null;
  }, [activeBookId, books]);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <div className="flex h-7 max-w-48 items-center overflow-hidden rounded-full border border-neutral-200 bg-background px-2 text-muted-foreground shadow-around dark:border-neutral-700 dark:bg-neutral-800">
        <PopoverTrigger asChild>
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
            <AtSign className="size-4 flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs">{activeBook ? activeBook.title : "选择书籍"}</span>
          </div>
        </PopoverTrigger>
        {activeBook && (
          <X className="size-4 flex-shrink-0 cursor-pointer hover:text-red-500" onClick={handleRemoveBook} />
        )}
      </div>
      <PopoverContent
        className="max-h-100 w-64 overflow-hidden rounded-md p-0 shadow-none"
        align="start"
        sideOffset={10}
        alignOffset={-8}
      >
        <div className="flex h-full max-h-100 flex-col">
          <div className="flex-shrink-0 p-2 pb-0">
            <div className="mb-2">
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 dark:border-neutral-700">
                <Search className="size-4 text-neutral-500" />
                <Input
                  placeholder="搜索书籍..."
                  className="h-8 border-0 p-0 focus-visible:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 pt-0">
            <div className="space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8 text-neutral-500 text-sm">
                  <p>加载书籍失败</p>
                </div>
              ) : books.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 text-sm">
                  {debouncedSearchQuery ? "未找到相关书籍" : "暂无书籍"}
                </div>
              ) : (
                books.map((book: SimpleBook) => (
                  <div
                    key={book.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1 px-2 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    onClick={() => handleSelectBook(book.id)}
                  >
                    <BookOpen className="size-4 flex-shrink-0 text-neutral-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-neutral-900 text-sm dark:text-neutral-100">
                        {book.title}
                      </div>
                      <div className="truncate text-neutral-500 text-xs dark:text-neutral-400">{book.author}</div>
                    </div>
                    {activeBookId === book.id && <Check className="size-4 flex-shrink-0 text-green-600" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
