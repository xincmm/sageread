use serde::Serialize;
use std::path::PathBuf;

/// 进度更新数据结构
#[derive(Debug, Clone, Serialize)]
pub struct ProgressUpdate {
    pub current: usize,
    pub total: usize,
    pub percent: f32,
    pub md_file_path: String,
    pub chunk_index: usize,
    pub related_chapter_titles: String,
}

/// 处理报告数据结构
#[derive(Debug, Clone)]
pub struct ProcessReport {
    pub db_path: PathBuf,
    pub book_title: String,
    pub book_author: String,
    pub total_chunks: usize,
    pub vector_dimension: usize,
}

/// 错误统计数据结构
#[derive(Debug, Clone)]
pub struct ErrorStats {
    pub failed_files: usize,
    pub failed_chunks: usize,
    pub failed_db_operations: usize,
    pub file_errors: Vec<String>,
}

impl ErrorStats {
    pub fn new() -> Self {
        Self {
            failed_files: 0,
            failed_chunks: 0,
            failed_db_operations: 0,
            file_errors: Vec::new(),
        }
    }
    
    pub fn add_file_error(&mut self, file_path: &str, error: &str) {
        self.failed_files += 1;
        self.file_errors.push(format!("{}: {}", file_path, error));
    }
    
    pub fn add_chunk_error(&mut self) {
        self.failed_chunks += 1;
    }
    
    pub fn add_db_error(&mut self) {
        self.failed_db_operations += 1;
    }
}
