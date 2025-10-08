import type { Book } from "@/types/book";
import type { BookWithStatus } from "@/types/simple-book";

import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir } from "@tauri-apps/api/path";

export async function convertBookWithStatusToBook(bookWithStatus: BookWithStatus): Promise<Book> {
  const appDataDirPath = await appDataDir();
  const absoluteFilePath = bookWithStatus.filePath.startsWith("/")
    ? bookWithStatus.filePath
    : `${appDataDirPath}/${bookWithStatus.filePath}`;

  const absoluteCoverPath = bookWithStatus.coverPath
    ? bookWithStatus.coverPath.startsWith("/")
      ? bookWithStatus.coverPath
      : `${appDataDirPath}/${bookWithStatus.coverPath}`
    : undefined;

  return {
    hash: bookWithStatus.id,
    format: bookWithStatus.format,
    title: bookWithStatus.title,
    author: bookWithStatus.author,
    tags: bookWithStatus.tags,
    filePath: absoluteFilePath,
    coverImageUrl: absoluteCoverPath ? convertFileSrc(absoluteCoverPath) : undefined,
    createdAt: bookWithStatus.createdAt,
    updatedAt: bookWithStatus.updatedAt,
    progress: bookWithStatus.status
      ? [bookWithStatus.status.progressCurrent, bookWithStatus.status.progressTotal]
      : undefined,
    primaryLanguage: bookWithStatus.language,
  };
}
