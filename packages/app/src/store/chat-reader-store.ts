import type { BookDoc } from "@/lib/document";
import { DocumentLoader } from "@/lib/document";
import { loadBookConfig } from "@/services/app-service";
import { getBookWithStatusById } from "@/services/book-service";
import type { Book, BookConfig } from "@/types/book";
import type { Thread } from "@/types/thread";
import { appDataDir } from "@tauri-apps/api/path";
import { create } from "zustand";
import { useAppSettingsStore } from "./app-settings-store";

export interface BookDataState {
  id: string;
  book: Book | null;
  file: File | null;
  config: BookConfig | null;
  bookDoc: BookDoc | null;
}

interface ChatReaderStore {
  activeBookId: string | undefined;
  bookData: BookDataState | null;
  activeContext: string | undefined;
  lastBookId: string | undefined;
  lastSemanticContext: string | undefined;
  config: BookConfig | undefined;
  isLoading: boolean;
  error: string | null;
  currentThread: Thread | null;

  setActiveBookId: (bookId: string | undefined) => void;
  setActiveContext: (context: string | undefined) => void;
  setLastBookId: (bookId: string | undefined) => void;
  setLastSemanticContext: (context: string | undefined) => void;
  setCurrentThread: (thread: Thread | null) => void;
}

export const useChatReaderStore = create<ChatReaderStore>((set, get) => ({
  activeBookId: undefined,
  bookData: null,
  activeContext: undefined,
  lastBookId: undefined,
  lastSemanticContext: undefined,
  config: undefined,
  isLoading: false,
  error: null,
  currentThread: null,

  setActiveBookId: async (bookId: string | undefined) => {
    const currentBookId = get().activeBookId;

    if (currentBookId && bookId && currentBookId !== bookId) {
      set({
        activeContext: undefined,
        lastBookId: undefined,
        lastSemanticContext: undefined,
        config: undefined,
        bookData: null,
      });
    }

    set({ activeBookId: bookId, bookData: null, isLoading: true, error: null });

    if (bookId) {
      try {
        const { settings } = useAppSettingsStore.getState();

        const simpleBook = await getBookWithStatusById(bookId);
        if (!simpleBook) throw new Error("Book not found");
        if (!simpleBook.filePath) throw new Error("Book file path is missing");

        const fileUrl = simpleBook.fileUrl;
        const baseDir = await appDataDir();

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch book file: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const filename = simpleBook.filePath.split("/").pop() || "book.epub";
        const file = new File([arrayBuffer], filename, {
          type: "application/epub+zip",
        });

        const book = {
          id: simpleBook.id,
          filePath: simpleBook.filePath,
          format: simpleBook.format,
          title: simpleBook.title,
          author: simpleBook.author,
          createdAt: simpleBook.createdAt,
          updatedAt: simpleBook.updatedAt,
          fileSize: simpleBook.fileSize,
          language: simpleBook.language,
          baseDir: `${baseDir}/books/${bookId}`,
        };

        const config = await loadBookConfig(bookId, settings);
        const { book: bookDoc } = await new DocumentLoader(file).open();

        const bookData: BookDataState = {
          id: bookId,
          book,
          file,
          config,
          bookDoc,
        };

        if (get().activeBookId === bookId) {
          set({ bookData, config, isLoading: false });
        }
      } catch (error) {
        console.error(`Error loading book ${bookId}:`, error);
        if (get().activeBookId === bookId) {
          set({
            bookData: null,
            error: error instanceof Error ? error.message : String(error),
            isLoading: false,
          });
        }
      }
    } else {
      set({ isLoading: false });
    }
  },

  setActiveContext: (context: string | undefined) => {
    set({ activeContext: context });
  },

  setLastBookId: (bookId: string | undefined) => {
    set({ lastBookId: bookId });
  },

  setLastSemanticContext: (context: string | undefined) => {
    set({ lastSemanticContext: context });
  },

  setCurrentThread: (thread: Thread | null) => {
    set({ currentThread: thread });
  },
}));
