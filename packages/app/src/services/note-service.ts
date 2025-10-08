import type { BookMeta, CreateNoteData, Note, NoteQueryOptions, UpdateNoteData } from "@/types/note";
import type { SimpleBook } from "@/types/simple-book";
import { invoke } from "@tauri-apps/api/core";

/**
 * 创建新笔记
 */
export async function createNote(data: CreateNoteData): Promise<Note> {
  try {
    const result = await invoke<Note>("create_note", { data });
    return result;
  } catch (error) {
    console.error("创建笔记失败:", error);
    throw new Error(`创建笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 更新笔记
 */
export async function updateNote(data: UpdateNoteData): Promise<Note> {
  try {
    const result = await invoke<Note>("update_note", { data });
    return result;
  } catch (error) {
    console.error("更新笔记失败:", error);
    throw new Error(`更新笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 删除笔记
 */
export async function deleteNote(id: string): Promise<void> {
  try {
    await invoke("delete_note", { id });
  } catch (error) {
    console.error("删除笔记失败:", error);
    throw new Error(`删除笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 根据ID获取笔记
 */
export async function getNoteById(id: string): Promise<Note | null> {
  try {
    const result = await invoke<Note | null>("get_note_by_id", { id });
    return result;
  } catch (error) {
    console.error("获取笔记详情失败:", error);
    throw new Error(`获取笔记详情失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取笔记列表
 */
export async function getNotes(options: NoteQueryOptions = {}): Promise<Note[]> {
  try {
    const result = await invoke<Note[]>("get_notes", { options });
    return result;
  } catch (error) {
    console.error("获取笔记列表失败:", error);
    throw new Error(`获取笔记列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取指定书籍的笔记
 */
export async function getNotesByBookId(
  bookId: string,
  options: Omit<NoteQueryOptions, "bookId"> = {},
): Promise<Note[]> {
  try {
    const queryOptions: NoteQueryOptions = {
      ...options,
      bookId,
    };
    return await getNotes(queryOptions);
  } catch (error) {
    console.error("获取书籍笔记失败:", error);
    throw new Error(`获取书籍笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 分页获取笔记
 */
export async function getNotesPaginated(
  page = 1,
  pageSize = 50,
  options: Omit<NoteQueryOptions, "limit" | "offset"> = {},
): Promise<Note[]> {
  try {
    const offset = (page - 1) * pageSize;
    const queryOptions: NoteQueryOptions = {
      ...options,
      limit: pageSize,
      offset,
    };
    return await getNotes(queryOptions);
  } catch (error) {
    console.error("分页获取笔记失败:", error);
    throw new Error(`分页获取笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 创建独立笔记（不关联书籍）
 */
export async function createStandaloneNote(noteData: Pick<CreateNoteData, "title" | "content">): Promise<Note> {
  try {
    const createData: CreateNoteData = {
      ...noteData,
      // 不设置bookId和bookMeta
    };

    return await createNote(createData);
  } catch (error) {
    console.error("创建独立笔记失败:", error);
    throw new Error(`创建独立笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 关联笔记到书籍
 */
export async function linkNoteToBook(noteId: string, book: SimpleBook): Promise<Note> {
  try {
    const bookMeta: BookMeta = {
      title: book.title,
      author: book.author,
    };

    const updateData: UpdateNoteData = {
      id: noteId,
      bookId: book.id,
      bookMeta,
    };

    return await updateNote(updateData);
  } catch (error) {
    console.error("关联笔记到书籍失败:", error);
    throw new Error(`关联笔记到书籍失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 取消笔记的书籍关联
 */
export async function unlinkNoteFromBook(noteId: string): Promise<Note> {
  try {
    const updateData: UpdateNoteData = {
      id: noteId,
      bookId: null, // 清空书籍关联
      bookMeta: null, // 清空书籍信息
    };

    return await updateNote(updateData);
  } catch (error) {
    console.error("取消笔记书籍关联失败:", error);
    throw new Error(`取消笔记书籍关联失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 更新笔记内容
 */
export async function updateNoteContent(
  noteId: string,
  updates: Pick<UpdateNoteData, "title" | "content">,
): Promise<Note> {
  try {
    const updateData: UpdateNoteData = {
      id: noteId,
      ...updates,
    };

    return await updateNote(updateData);
  } catch (error) {
    console.error("更新笔记内容失败:", error);
    throw new Error(`更新笔记内容失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取最近更新的笔记
 */
export async function getRecentNotes(limit = 10): Promise<Note[]> {
  try {
    const options: NoteQueryOptions = {
      limit,
      sortBy: "updated_at",
      sortOrder: "desc",
    };

    return await getNotes(options);
  } catch (error) {
    console.error("获取最近笔记失败:", error);
    throw new Error(`获取最近笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 按标题排序获取笔记
 */
export async function getNotesByTitle(order: "asc" | "desc" = "asc"): Promise<Note[]> {
  try {
    const options: NoteQueryOptions = {
      sortBy: "title",
      sortOrder: order,
    };

    return await getNotes(options);
  } catch (error) {
    console.error("按标题获取笔记失败:", error);
    throw new Error(`按标题获取笔记失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 检查笔记是否存在
 */
export async function noteExists(id: string): Promise<boolean> {
  try {
    const note = await getNoteById(id);
    return note !== null;
  } catch (error) {
    console.error("检查笔记存在性失败:", error);
    return false;
  }
}
