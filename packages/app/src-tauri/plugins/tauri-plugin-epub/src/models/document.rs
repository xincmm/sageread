use serde::{Deserialize, Serialize};

/// 文档分片数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: Option<i64>,
    pub book_title: String,
    pub book_author: String,

    // 文件信息
    pub md_file_path: String,        // MD文件路径 "text/part001.md"
    pub file_order_in_book: u32,     // 文件在书中的顺序

    // 章节关联信息（使用 | 分隔符）
    pub related_chapter_titles: String, // "第一章 引言|1.1 背景介绍|1.2 研究目标"

    // 分片信息
    pub chunk_text: String,
    pub chunk_order_in_file: usize,  // 在文件中的分片顺序
    pub total_chunks_in_file: usize, // 该文件的总分片数

    // 向量信息
    pub embedding: Vec<f32>,

    // 全局位置信息
    pub global_chunk_index: usize,   // 在整本书中的全局分块序号
}

/// 搜索结果数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub chunk_id: i64,
    pub book_title: String,
    pub book_author: String,
    pub md_file_path: String,
    pub file_order_in_book: u32,
    pub related_chapter_titles: String,
    pub chunk_text: String,
    pub chunk_order_in_file: usize,
    pub total_chunks_in_file: usize,
    pub global_chunk_index: usize,
    pub similarity_score: f32,
}
