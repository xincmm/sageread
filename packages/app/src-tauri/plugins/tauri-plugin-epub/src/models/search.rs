use serde::{Deserialize, Serialize};
use crate::models::SearchResult;

/// 搜索模式枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SearchMode {
    #[serde(rename = "vector")]
    VectorOnly,    // 纯向量搜索（现有模式）
    #[serde(rename = "bm25")]
    BM25Only,      // 纯BM25文本搜索
    #[serde(rename = "hybrid")]
    Hybrid,        // 混合搜索（默认）
}

impl Default for SearchMode {
    fn default() -> Self {
        SearchMode::Hybrid
    }
}

impl std::str::FromStr for SearchMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "vector" => Ok(SearchMode::VectorOnly),
            "bm25" => Ok(SearchMode::BM25Only),
            "hybrid" => Ok(SearchMode::Hybrid),
            _ => Err(format!("Invalid search mode: {}", s)),
        }
    }
}

/// 混合搜索配置
#[derive(Debug, Clone)]
pub struct HybridSearchConfig {
    pub mode: SearchMode,
    pub vector_weight: f32,    // 向量搜索权重 (0.0-1.0)
    pub bm25_weight: f32,      // BM25搜索权重 (0.0-1.0)
    pub k1: f32,               // BM25参数k1 (默认1.2)
    pub b: f32,                // BM25参数b (默认0.75)
}

impl Default for HybridSearchConfig {
    fn default() -> Self {
        Self {
            mode: SearchMode::Hybrid,
            vector_weight: 0.7,    // 向量搜索权重70%
            bm25_weight: 0.3,      // BM25搜索权重30%
            k1: 1.2,               // BM25标准参数
            b: 0.75,               // BM25标准参数
        }
    }
}

// 移除了未使用的impl块

/// 混合搜索结果
#[derive(Debug, Clone)]
pub struct HybridSearchResult {
    pub combined_score: f32,          // 加权合并分数
    pub search_result: SearchResult,  // 原始搜索结果
}

/// BM25统计信息
#[derive(Debug, Clone)]
pub struct BM25Stats {
    pub total_docs: usize,
    pub avg_doc_length: f32,
}

// 移除了未使用的DocumentTermFreq结构体

/// BM25搜索结果
#[derive(Debug, Clone)]
pub struct BM25SearchResult {
    pub score: f32,
    pub search_result: SearchResult,
}
