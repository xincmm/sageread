/**
 * 文档分块类型定义
 * 用于 RAG 检索、上下文获取等功能
 */
export type DocumentChunk = {
  id?: number;
  book_title: string;
  book_author: string;
  md_file_path: string;
  file_order_in_book: number;
  related_chapter_titles: string;
  chunk_text: string;
  chunk_order_in_file: number;
  total_chunks_in_file: number;
  global_chunk_index: number;
};

/**
 * 搜索结果项类型定义
 * 用于向量搜索等功能
 */
export type SearchItem = {
  book_title: string;
  book_author: string;
  related_chapter_titles: string;
  content: string;
  similarity: number;
};

/**
 * 增强的搜索结果类型，包含位置信息
 * 用于 RAG 工具返回结果
 */
export type EnhancedSearchItem = {
  book_title: string;
  book_author: string;
  related_chapter_titles: string;
  content: string;
  similarity: number;

  // 位置信息，用于智能上下文检索
  chunk_id: number | null;
  md_file_path: string;
  file_order_in_book: number;
  global_chunk_index: number;
  chunk_order_in_file: number;
  total_chunks_in_file: number;
};
