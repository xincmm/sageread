import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { useMemo } from "react";

export const useBooksFilter = (filteredBooksByTag: BookWithStatusAndUrls[], searchQuery: string) => {
  const filteredBooks = useMemo(() => {
    const books = filteredBooksByTag;

    if (!searchQuery.trim()) {
      return books;
    }

    const query = searchQuery.toLowerCase().trim();
    return books.filter((book: BookWithStatusAndUrls) => {
      if (book.title.toLowerCase().includes(query)) return true;
      if (book.author.toLowerCase().includes(query)) return true;
      if (book.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [filteredBooksByTag, searchQuery]);

  return {
    filteredBooks,
  };
};
