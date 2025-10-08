// 书籍元信息类型
export interface BookMeta {
  title: string;
  author: string;
}

// 笔记主要数据结构
export interface Note {
  id: string;
  bookId?: string;
  bookMeta?: BookMeta;
  title?: string;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

// 创建笔记时的输入数据
export interface CreateNoteData {
  bookId?: string;
  bookMeta?: BookMeta;
  title?: string;
  content?: string;
}

// 更新笔记时的输入数据
export interface UpdateNoteData {
  id: string;
  bookId?: string | null; // null表示清空书籍关联
  bookMeta?: BookMeta | null; // null表示清空书籍信息
  title?: string | null; // null表示清空标题
  content?: string | null; // null表示清空内容
}

// 查询笔记时的选项
export interface NoteQueryOptions {
  limit?: number;
  offset?: number;
  bookId?: string;
  sortBy?: "updated_at" | "created_at" | "title";
  sortOrder?: "asc" | "desc";
}

// API响应类型
export interface NotesResponse {
  notes: Note[];
  total?: number;
}

// 笔记统计信息
export interface NoteStats {
  total: number;
  withBooks: number;
  withoutBooks: number;
}
