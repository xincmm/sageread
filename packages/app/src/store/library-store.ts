import { convertBookWithStatusUrls, getBooksWithStatus } from "@/services/book-service";
import type { Book, BooksGroup } from "@/types/book";
import type { BookWithStatusAndUrls } from "@/types/simple-book";
import { create } from "zustand";

interface LibraryState {
  library: Book[];
  currentBookshelf: (Book | BooksGroup)[];
  searchQuery: string;
  booksWithStatus: BookWithStatusAndUrls[];
  isLoading: boolean;
  getVisibleLibrary: () => Book[];
  setLibrary: (books: Book[]) => void;
  setCurrentBookshelf: (bookshelf: (Book | BooksGroup)[]) => void;
  setSearchQuery: (query: string) => void;
  refreshBooks: () => Promise<void>;
  setBooksWithStatus: (books: BookWithStatusAndUrls[]) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  library: [],
  currentBookshelf: [],
  searchQuery: "",
  booksWithStatus: [],
  isLoading: false,
  getVisibleLibrary: () => get().library.filter((book) => !book.deletedAt),
  setCurrentBookshelf: (bookshelf: (Book | BooksGroup)[]) => {
    set({ currentBookshelf: bookshelf });
  },
  setLibrary: (books) => set({ library: books }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setBooksWithStatus: (books) => set({ booksWithStatus: books }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  refreshBooks: async () => {
    try {
      set({ isLoading: true });
      const libraryBooks = await getBooksWithStatus();
      const booksWithUrls = await Promise.all(libraryBooks.map(convertBookWithStatusUrls));
      set({ booksWithStatus: booksWithUrls });
    } catch (error) {
      console.error("Error refreshing books:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
