import type { BookConfig, ViewSettings } from "@/types/book";
import type { SystemSettings } from "@/types/settings";

import { getTargetLang, isCJKEnv } from "@/utils/misc";
import { getBookNotes } from "./book-note-service";
import { getBookStatus, updateBookStatus } from "./book-service";
import {
  DEFAULT_BOOK_FONT,
  DEFAULT_BOOK_LAYOUT,
  DEFAULT_BOOK_SEARCH_CONFIG,
  DEFAULT_BOOK_STYLE,
  DEFAULT_CJK_VIEW_SETTINGS,
  DEFAULT_SCREEN_CONFIG,
  DEFAULT_TRANSLATOR_CONFIG,
  DEFAULT_TTS_CONFIG,
  DEFAULT_VIEW_CONFIG,
} from "./constants";

export const getDefaultViewSettings: ViewSettings = {
  ...DEFAULT_BOOK_LAYOUT,
  ...DEFAULT_BOOK_STYLE,
  ...DEFAULT_BOOK_FONT,
  ...(isCJKEnv() ? DEFAULT_CJK_VIEW_SETTINGS : {}),
  ...DEFAULT_VIEW_CONFIG,
  ...DEFAULT_TTS_CONFIG,
  ...DEFAULT_SCREEN_CONFIG,
  ...{ ...DEFAULT_TRANSLATOR_CONFIG, translateTargetLang: getTargetLang() },
};

export async function loadBookConfig(bookId: string, settings: SystemSettings): Promise<BookConfig> {
  const { globalViewSettings } = settings;

  const bookStatus = await getBookStatus(bookId);
  const bookNotes = await getBookNotes(bookId);

  if (bookStatus) {
    const config: BookConfig = {
      bookHash: bookId,
      progress:
        bookStatus.progressCurrent && bookStatus.progressTotal
          ? [bookStatus.progressCurrent, bookStatus.progressTotal]
          : undefined,
      location: bookStatus.location || undefined,
      booknotes: bookNotes,
      viewSettings: globalViewSettings,
      searchConfig: DEFAULT_BOOK_SEARCH_CONFIG,
      updatedAt: bookStatus.updatedAt || Date.now(),
    };

    return config;
  }

  return {
    viewSettings: globalViewSettings,
    searchConfig: DEFAULT_BOOK_SEARCH_CONFIG,
    booknotes: bookNotes,
    updatedAt: Date.now(),
  };
}

export async function saveBookConfig(bookId: string, config: BookConfig) {
  await updateBookStatus(bookId, {
    progressCurrent: config.progress?.[0] || 0,
    progressTotal: config.progress?.[1] || 0,
    location: config.location || "",
    lastReadAt: Date.now(),
  });
}
