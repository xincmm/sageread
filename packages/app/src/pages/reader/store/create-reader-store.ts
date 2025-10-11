import { DocumentLoader } from "@/lib/document";
import type { BookDoc } from "@/lib/document";
import { loadBookConfig, saveBookConfig } from "@/services/app-service";
import { getBookWithStatusById, loadReadableBookFile } from "@/services/book-service";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLibraryStore } from "@/store/library-store";
import type { Book, BookConfig, BookNote, BookProgress } from "@/types/book";
import type { SessionStats } from "@/types/reading-session";
import type { Thread } from "@/types/thread";
import type { FoliateView } from "@/types/view";
import { appDataDir } from "@tauri-apps/api/path";
import { createStore } from "zustand";

export interface BookDataState {
  id: string;
  book: Book | null;
  file: File | null;
  config: BookConfig | null;
  bookDoc: BookDoc | null;
}

export type OpenDropdown = "toc" | "search" | "settings" | null;

export interface ReaderState {
  bookId: string;
  config: BookConfig | null;
  bookData: BookDataState | null;
  view: FoliateView | null;
  location: string | null;
  isLoading: boolean;
  error: string | null;
  progress: BookProgress | undefined;
  sessionStats: SessionStats | null;
  isSessionInitialized: boolean;
  activeContext: string | undefined;
  openDropdown: OpenDropdown;
  currentThread: Thread | null;

  initBook: () => Promise<void>;
  setConfig: (config: BookConfig) => void;
  setActiveContext: (context: string | undefined) => void;
  saveConfig: (config: BookConfig) => Promise<void>;
  updateBooknotes: (booknotes: BookNote[]) => BookConfig | undefined;
  setView: (view: FoliateView) => void;
  setLocation: (location: string) => void;
  setProgress: (progress: BookProgress) => void;
  setSessionStats: (stats: SessionStats | null) => void;
  setSessionInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setOpenDropdown: (dropdown: OpenDropdown) => void;
  setCurrentThread: (thread: Thread | null) => void;
}

export const createReaderStore = (bookId: string) => {
  return createStore<ReaderState>((set, get) => ({
    bookId,
    config: null,
    activeContext: undefined,
    bookData: null,
    view: null,
    location: null,
    isLoading: false,
    error: null,
    progress: undefined,
    sessionStats: null,
    isSessionInitialized: false,
    openDropdown: null,
    currentThread: null,

    initBook: async () => {
      try {
        set({ isLoading: true, error: null });

        const { settings } = useAppSettingsStore.getState();

        const simpleBook = await getBookWithStatusById(bookId);
        if (!simpleBook) throw new Error("Book not found");
        if (!simpleBook.filePath) throw new Error("Book file path is missing");

        const baseDir = await appDataDir();
        const file = await loadReadableBookFile(
          {
            filePath: simpleBook.filePath,
            format: simpleBook.format,
          },
          bookId,
        );

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

        set({
          config,
          bookData,
          isLoading: false,
        });
      } catch (err) {
        console.error("[ReaderStore] Error loading book:", err);
        set({
          error: err instanceof Error ? err.message : String(err),
          isLoading: false,
        });
      }
    },

    setConfig: (config) => set({ config }),
    saveConfig: async (config) => {
      const { bookId, bookData } = get();
      if (!bookData?.book) return;

      const { library, setLibrary } = useLibraryStore.getState();
      const bookIndex = library.findIndex((b) => b.id === bookId);
      if (bookIndex === -1) return;

      const book = library.splice(bookIndex, 1)[0]!;
      book.progress = config.progress;
      book.updatedAt = Date.now();
      library.unshift(book);
      setLibrary(library);

      config.updatedAt = Date.now();
      await saveBookConfig(bookData.book.id, config);
      set({ config });
    },
    updateBooknotes: (booknotes) => {
      const { config } = get();
      if (!config) return undefined;

      const updatedConfig = {
        ...config,
        updatedAt: Date.now(),
        booknotes: booknotes,
      } as BookConfig;

      set({ config: updatedConfig });
      return updatedConfig;
    },
    setView: (view) => set({ view }),
    setLocation: (location) => set({ location }),
    setProgress: (progress) => set({ progress }),
    setSessionStats: (stats) => set({ sessionStats: stats }),
    setSessionInitialized: (initialized) => set({ isSessionInitialized: initialized }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setActiveContext: (context) => set({ activeContext: context }),
    setOpenDropdown: (dropdown) => set({ openDropdown: dropdown }),
    setCurrentThread: (thread: Thread | null) => set({ currentThread: thread }),
  }));
};

export type ReaderStore = ReturnType<typeof createReaderStore>;
