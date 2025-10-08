import { deleteBook, updateBook } from "@/services/book-service";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { useCallback } from "react";
import { toast } from "sonner";

export const useBooksOperations = (refreshBooks: () => Promise<void>) => {
  const handleBookDelete = useCallback(
    async (book: BookWithStatusAndUrls) => {
      try {
        await deleteBook(book.id);

        await refreshBooks();
        return true;
      } catch (error) {
        console.error("Failed to delete book:", error);
        return false;
      }
    },
    [refreshBooks],
  );

  const handleBookUpdate = useCallback(
    async (bookId: string, updateData: { title?: string; author?: string; coverPath?: string; tags?: string[] }) => {
      try {
        await updateBook(bookId, updateData);
        await refreshBooks();
        toast.success("更新成功");
        return true;
      } catch (error) {
        console.error("Failed to update book:", error);
        toast.error("更新失败");
        return false;
      }
    },
    [refreshBooks],
  );

  return {
    handleBookDelete,
    handleBookUpdate,
  };
};
