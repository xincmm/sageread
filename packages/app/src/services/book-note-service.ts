import type { BookNote } from "@/types/book";
import { invoke } from "@tauri-apps/api/core";

// BookNote 创建数据类型
export interface BookNoteCreateData {
  bookId: string;
  type: "bookmark" | "annotation" | "excerpt";
  cfi: string;
  text?: string;
  style?: "highlight" | "underline" | "squiggly";
  color?: "red" | "yellow" | "green" | "blue" | "violet";
  note: string;
  context?: {
    before: string;
    after: string;
  };
}

// BookNote 更新数据类型
export interface BookNoteUpdateData {
  type?: "bookmark" | "annotation" | "excerpt";
  cfi?: string;
  text?: string;
  style?: "highlight" | "underline" | "squiggly";
  color?: "red" | "yellow" | "green" | "blue" | "violet";
  note?: string;
  context?: {
    before: string;
    after: string;
  };
}

/**
 * 创建新的书籍笔记
 */
export async function createBookNote(noteData: BookNoteCreateData): Promise<BookNote> {
  const result = await invoke<BookNote>("create_book_note", { noteData });
  return result;
}

/**
 * 获取指定书籍的所有笔记
 */
export async function getBookNotes(bookId: string): Promise<BookNote[]> {
  const result = await invoke<BookNote[]>("get_book_notes", { bookId });
  return result;
}

/**
 * 更新指定的书籍笔记
 */
export async function updateBookNote(id: string, updateData: BookNoteUpdateData): Promise<BookNote> {
  const result = await invoke<BookNote>("update_book_note", { id, updateData });
  return result;
}

/**
 * 删除指定的书籍笔记
 */
export async function deleteBookNote(id: string): Promise<void> {
  await invoke("delete_book_note", { id });
}
