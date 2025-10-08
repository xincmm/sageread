/// 处理选项配置
#[derive(Debug, Clone)]
pub struct ProcessOptions {
    pub batch_size: Option<usize>,
    pub vectorizer: VectorizerConfig,
}

/// 向量化器配置
#[derive(Debug, Clone)]
pub struct VectorizerConfig {
    pub embeddings_url: String,
    pub model_name: String,
    pub api_key: Option<String>,
}

/// API相关的DTO结构
use serde::Serialize;
use super::ProcessReport;

#[derive(Serialize)]
pub struct ParsedBook {
    pub title: String,
    pub author: String,
    pub chapters: usize,
}

#[derive(Serialize)]
pub struct IndexResult {
    pub success: bool,
    pub message: String,
    pub report: Option<ProcessReportDto>,
}

#[derive(Serialize)]
pub struct MdbookResult {
    pub success: bool,
    pub message: String,
    #[serde(rename = "outputDir")]
    pub output_dir: Option<String>,
}

#[derive(Serialize)]
pub struct ProcessReportDto {
    pub db_path: String,
    pub book_title: String,
    pub book_author: String,
    pub total_chunks: usize,
    pub vector_dimension: usize,
}

impl From<ProcessReport> for ProcessReportDto {
    fn from(r: ProcessReport) -> Self {
        Self {
            db_path: r.db_path.to_string_lossy().to_string(),
            book_title: r.book_title,
            book_author: r.book_author,
            total_chunks: r.total_chunks,
            vector_dimension: r.vector_dimension,
        }
    }
}
