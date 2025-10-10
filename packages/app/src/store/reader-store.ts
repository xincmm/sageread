import { type BookDoc, DocumentLoader } from "@/lib/document";
import { loadBookConfig, saveBookConfig } from "@/services/app-service";
import { getBookById, loadReadableBookFile } from "@/services/book-service";
import type { Book, BookConfig, BookNote, BookProgress } from "@/types/book";
import type { SystemSettings } from "@/types/settings";
import type { SimpleBook } from "@/types/simple-book";
import type { FoliateView } from "@/types/view";
import { getBaseFilename, getPrimaryLanguage } from "@/utils/book";
import { updateToc } from "@/utils/toc";
import { appDataDir } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { TabProperties } from "app-tabs";
import { create } from "zustand";
import { useAppSettingsStore } from "./app-settings-store";
import { useLibraryStore } from "./library-store";

export interface BookMetadata {
  title?: string;
  language?: string;
  published?: string;
  publisher?: string;
  author?: string | { name?: string }[] | { name?: string };
  base_dir?: string;
}

export interface BookDataState {
  id: string;
  book: Book | null;
  file: File | null;
  config: BookConfig | null;
  bookDoc: BookDoc | null;
}

export interface BookState {
  bookData: BookDataState | null;
  view: FoliateView | null;
  progress: BookProgress | null;
  settings: SystemSettings;
  metadata: BookMetadata | null;
}

export interface TabInfo extends TabProperties {
  bookId: string;
}

interface ReaderStore {
  activeBookId: string | null;
  activeBook: (SimpleBook & BookMetadata) | null;
  activeContext: string | null;
  lastBookId: string | null;
  lastSemanticContext: string | null;
  booksState: { [bookId: string]: BookState };
  tabs: TabInfo[];
  activeTabId: string | null;
  isHomeActive: boolean;

  setActiveBookId: (bookId: string | null) => void;
  setActiveContext: (context: string | null) => void;
  getActiveContext: () => string | null;
  setLastBookId: (bookId: string | null) => void;
  setLastSemanticContext: (context: string | null) => void;
  addTab: (bookId: string, title?: string) => void;
  removeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<TabProperties>) => void;
  openReader: (bookId: string, title?: string) => void;
  navigateToHome: () => void;
  getBookData: (bookId?: string | null) => BookDataState | null;
  getConfig: (bookId?: string | null) => BookConfig | null;
  saveConfig: (bookId: string, config: BookConfig) => Promise<void>;
  updateBooknotes: (key: string, booknotes: BookNote[]) => BookConfig | undefined;
  getView: (bookId?: string | null) => FoliateView | null;
  setView: (view: FoliateView, bookId?: string | null) => void;
  getProgress: (bookId?: string | null) => BookProgress | null;
  setProgress: (progress: BookProgress, bookId?: string | null) => void;
  getBookSettings: (bookId?: string | null) => SystemSettings;
  setBookSettings: (settings: SystemSettings, bookId?: string | null) => void;
  initBookData: (bookId: string) => Promise<void>;
}

async function loadBookMetadata(bookId: string): Promise<BookMetadata | null> {
  try {
    const appDataDirPath = await appDataDir();
    const metadataPath = `${appDataDirPath}/books/${bookId}/metadata.json`;
    const metadataContent = await readTextFile(metadataPath);
    const metadata = JSON.parse(metadataContent) as BookMetadata;
    return metadata;
  } catch (error) {
    console.error(`Failed to load metadata for book ${bookId}:`, error);
    return null;
  }
}

export const useReaderStore = create<ReaderStore>((set, get) => ({
  activeBookId: null,
  activeBook: null,
  activeContext: null,
  lastBookId: null,
  lastSemanticContext: null,
  booksState: {},
  tabs: [],
  activeTabId: null,
  isHomeActive: true,
  isStatisticsActive: false,

  setActiveBookId: async (bookId: string | null) => {
    const currentBookId = get().activeBookId;

    if (currentBookId && bookId && currentBookId !== bookId) {
      set({
        activeContext: null,
        lastBookId: null,
        lastSemanticContext: null,
      });
    }

    set({ activeBookId: bookId, activeBook: null });

    if (bookId) {
      try {
        const metadata = await loadBookMetadata(bookId);
        const bookData = await getBookById(bookId);
        if (bookData) {
          set({ activeBook: { ...metadata, ...bookData } });
        }
      } catch (error) {
        console.error(`Error loading metadata for book ${bookId}:`, error);
        if (get().activeBookId === bookId) {
          set({ activeBook: null });
        }
      }
    }
  },

  setActiveContext: (context: string | null) => {
    set({ activeContext: context });
  },

  getActiveContext: () => {
    return get().activeContext;
  },

  setLastBookId: (bookId: string | null) => {
    set({ lastBookId: bookId });
  },

  setLastSemanticContext: (context: string | null) => {
    set({ lastSemanticContext: context });
  },

  addTab: (bookId: string, title?: string) => {
    const tabId = `reader-${bookId}`;
    const tabTitle = title || `阅读器 - ${bookId}`;

    set((state) => {
      if (state.tabs.find((tab) => tab.id === tabId)) {
        return {
          ...state,
          tabs: state.tabs.map((tab) => ({
            ...tab,
            active: tab.id === tabId,
          })),
          activeTabId: tabId,
          isHomeActive: false,
          isStatisticsActive: false,
          activeBookId: bookId,
        };
      }

      const newTab: TabInfo = {
        id: tabId,
        title: tabTitle,
        active: true,
        isCloseIconVisible: true,
        bookId,
      };

      return {
        ...state,
        tabs: [...state.tabs.map((tab) => ({ ...tab, active: false })), newTab],
        activeTabId: tabId,
        isHomeActive: false,
        isStatisticsActive: false,
        activeBookId: bookId,
      };
    });
  },

  removeTab: (tabId: string) => {
    set((state) => {
      const removedTabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
      const removedTab = state.tabs[removedTabIndex];
      const wasActive = removedTab?.active;
      const tabsAfterClose = state.tabs.filter((tab) => tab.id !== tabId);

      let newActiveTabId = state.activeTabId;
      let newActiveBookId = state.activeBookId;
      let newIsLibraryActive = state.isHomeActive;

      if (wasActive) {
        if (tabsAfterClose.length > 0) {
          let newActiveIndex: number;
          if (removedTabIndex < tabsAfterClose.length) {
            newActiveIndex = removedTabIndex;
          } else {
            newActiveIndex = tabsAfterClose.length - 1;
          }

          if (newActiveIndex >= 0 && newActiveIndex < tabsAfterClose.length) {
            tabsAfterClose[newActiveIndex].active = true;
            newActiveTabId = tabsAfterClose[newActiveIndex].id;
            newActiveBookId = tabsAfterClose[newActiveIndex].bookId;
          }
        } else {
          newActiveTabId = null;
          newActiveBookId = null;
          newIsLibraryActive = true;
        }
      }

      const newBooksState = { ...state.booksState };
      if (removedTab?.bookId) {
        delete newBooksState[removedTab.bookId];
      }

      return {
        ...state,
        tabs: tabsAfterClose,
        activeTabId: newActiveTabId,
        activeBookId: newActiveBookId,
        isHomeActive: newIsLibraryActive,
        booksState: newBooksState,
      };
    });
  },

  activateTab: (tabId: string) => {
    set((state) => {
      const targetTab = state.tabs.find((tab) => tab.id === tabId);
      return {
        ...state,
        tabs: state.tabs.map((tab) => ({ ...tab, active: tab.id === tabId })),
        activeTabId: tabId,
        activeBookId: targetTab?.bookId || null,
        isHomeActive: false,
      };
    });
  },

  updateTab: (tabId: string, updates: Partial<TabProperties>) => {
    set((state) => ({
      ...state,
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
    }));
  },

  openReader: (bookId: string, title?: string) => {
    get().addTab(bookId, title);
    if (!get().booksState[bookId]) {
      set((state) => ({
        ...state,
        booksState: {
          ...state.booksState,
          [bookId]: {
            bookData: null,
            view: null,
            progress: null,
            settings: {} as SystemSettings,
            metadata: null,
          },
        },
      }));
    }
  },

  navigateToHome: () => {
    set((state) => ({
      ...state,
      tabs: state.tabs.map((tab) => ({ ...tab, active: false })),
      activeTabId: null,
      activeBookId: null,
      isHomeActive: true,
    }));
  },

  getBookData: (bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return null;
    const result = get().booksState[targetBookId]?.bookData || null;
    if (!targetBookId) return null;
    return result;
  },

  getConfig: (bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return null;
    return get().booksState[targetBookId]?.bookData?.config || null;
  },

  saveConfig: async (bookId: string, config: BookConfig) => {
    const { library, setLibrary } = useLibraryStore.getState();
    const id = bookId.split("-")[0]!;
    const bookIndex = library.findIndex((b) => b.id === id);
    if (bookIndex === -1) return;

    const book = library.splice(bookIndex, 1)[0]!;
    book.progress = config.progress;
    book.updatedAt = Date.now();
    library.unshift(book);
    setLibrary(library);

    config.updatedAt = Date.now();
    await saveBookConfig(bookId, config);
  },

  updateBooknotes: (key: string, booknotes: BookNote[]) => {
    const state = get();
    const id = key.split("-")[0]!;
    const bookState = state.booksState[id];
    const bookData = bookState?.bookData;

    if (!bookData?.config) return undefined;

    const updatedConfig = {
      ...bookData.config,
      updatedAt: Date.now(),
      booknotes: booknotes,
    } as BookConfig;

    set((state) => ({
      booksState: {
        ...state.booksState,
        [id]: {
          ...bookState!,
          bookData: {
            ...bookData,
            config: updatedConfig!,
          },
        },
      },
    }));

    return updatedConfig;
  },

  getView: (bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return null;
    return get().booksState[targetBookId]?.view || null;
  },

  setView: (view: FoliateView, bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return;

    set((state) => ({
      booksState: {
        ...state.booksState,
        [targetBookId]: {
          ...state.booksState[targetBookId]!,
          view,
        },
      },
    }));
  },

  getProgress: (bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return null;
    return get().booksState[targetBookId]?.progress || null;
  },

  setProgress: (progress: BookProgress, bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return;

    set((state) => {
      const currentBookState = state.booksState[targetBookId];
      if (!currentBookState) return state;
      const currentLocation = currentBookState.bookData?.config?.location;
      const newLocation = progress.location;
      const locationChanged = currentLocation !== newLocation;
      const updatedBookData =
        currentBookState.bookData && locationChanged
          ? {
              ...currentBookState.bookData,
              config: currentBookState.bookData.config
                ? {
                    ...currentBookState.bookData.config,
                    location: newLocation,
                  }
                : null,
            }
          : currentBookState.bookData;

      return {
        booksState: {
          ...state.booksState,
          [targetBookId]: {
            ...currentBookState,
            progress,
            bookData: updatedBookData,
          },
        },
      };
    });
  },

  getBookSettings: (bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return {} as SystemSettings;
    return get().booksState[targetBookId]?.settings || ({} as SystemSettings);
  },

  setBookSettings: (settings: SystemSettings, bookId?: string | null) => {
    const targetBookId = bookId ?? get().activeBookId;
    if (!targetBookId) return;

    set((state) => ({
      booksState: {
        ...state.booksState,
        [targetBookId]: {
          ...state.booksState[targetBookId]!,
          settings,
        },
      },
    }));
  },

  initBookData: async (bookId: string) => {
    try {
      const settings = get().getBookSettings(bookId);

      const { library } = useLibraryStore.getState();
      const book = library.find((b) => b.id === bookId);
      if (!book) {
        throw new Error("Book not found");
      }
      const file = await loadReadableBookFile(
        {
          filePath: book.filePath,
          format: book.format,
        },
        bookId,
      );
      const config = await loadBookConfig(bookId, settings);
      if (!config) {
        throw new Error("Config not found");
      }
      const { book: bookDoc } = await new DocumentLoader(file).open();

      // 使用全局设置中的 sortedTOC
      const { settings: appSettings } = useAppSettingsStore.getState();
      updateToc(bookDoc, appSettings.globalViewSettings.sortedTOC);

      if (!bookDoc.metadata.title) {
        bookDoc.metadata.title = getBaseFilename(file.name);
      }
      const primaryLanguage = getPrimaryLanguage(bookDoc.metadata.language);
      book.primaryLanguage = book.primaryLanguage ?? primaryLanguage;
      book.baseDir = `${await appDataDir()}/books/${bookId}`;

      set((state) => {
        return {
          lastBookId: !state.lastBookId ? bookId : state.lastBookId,
          booksState: {
            ...state.booksState,
            [bookId]: {
              bookData: { id: bookId, book, file, config, bookDoc },
              view: null,
              progress: null,
              settings,
              metadata: null,
            },
          },
        };
      });
    } catch (error) {
      console.error(`Failed to initialize book data for book ${bookId}:`, error);
    }
  },
}));
