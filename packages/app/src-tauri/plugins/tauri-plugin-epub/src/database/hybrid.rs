use anyhow::Result;
use std::collections::HashMap;

use crate::database::{DatabaseConnection, DatabaseSearch, BM25Search};
use crate::models::{SearchResult, HybridSearchConfig, HybridSearchResult, SearchMode};

/// 混合搜索实现
pub struct HybridSearch<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> HybridSearch<'a> {
    /// 创建新的混合搜索实例
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// 执行混合搜索
    pub fn search(
        &self,
        query: &str,
        query_embedding: &[f32],
        limit: usize,
        config: &HybridSearchConfig,
    ) -> Result<Vec<SearchResult>> {
        match config.mode {
            SearchMode::VectorOnly => self.vector_only_search(query_embedding, limit),
            SearchMode::BM25Only => self.bm25_only_search(query, limit, config),
            SearchMode::Hybrid => self.hybrid_search(query, query_embedding, limit, config),
        }
    }

    /// 纯向量搜索
    fn vector_only_search(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
        let search = DatabaseSearch::new(self.db);
        search.vector_search(query_embedding, limit)
    }

    /// 纯BM25搜索
    fn bm25_only_search(&self, query: &str, limit: usize, config: &HybridSearchConfig) -> Result<Vec<SearchResult>> {
        let bm25_search = BM25Search::new(self.db, config.k1, config.b);
        let bm25_results = bm25_search.search(query, limit)?;
        
        // 转换为SearchResult格式
        Ok(bm25_results.into_iter().map(|r| {
            let mut result = r.search_result;
            result.similarity_score = r.score;
            result
        }).collect())
    }

    /// 混合搜索
    fn hybrid_search(
        &self,
        query: &str,
        query_embedding: &[f32],
        limit: usize,
        config: &HybridSearchConfig,
    ) -> Result<Vec<SearchResult>> {
        // 1. 并行执行两种搜索（这里是顺序执行，可以优化为真正的并行）
        let vector_results = self.vector_only_search(query_embedding, limit * 2)?;
        let bm25_results = self.bm25_only_search(query, limit * 2, config)?;

        // 2. 合并和重排序结果
        let hybrid_results = self.combine_and_rerank(vector_results, bm25_results, config)?;

        // 3. 限制结果数量
        let final_results: Vec<SearchResult> = hybrid_results
            .into_iter()
            .take(limit)
            .map(|hr| {
                let mut result = hr.search_result;
                result.similarity_score = hr.combined_score;
                result
            })
            .collect();

        Ok(final_results)
    }

    /// 合并和重排序结果
    fn combine_and_rerank(
        &self,
        vector_results: Vec<SearchResult>,
        bm25_results: Vec<SearchResult>,
        config: &HybridSearchConfig,
    ) -> Result<Vec<HybridSearchResult>> {
        // 1. 归一化分数
        let normalized_vector = self.normalize_scores(&vector_results);
        let normalized_bm25 = self.normalize_scores(&bm25_results);

        // 2. 创建结果映射
        let mut vector_map: HashMap<i64, f32> = HashMap::new();
        let mut bm25_map: HashMap<i64, f32> = HashMap::new();
        let mut all_results: HashMap<i64, SearchResult> = HashMap::new();

        // 填充向量搜索结果
        for (result, norm_score) in vector_results.into_iter().zip(normalized_vector.into_iter()) {
            vector_map.insert(result.chunk_id, norm_score);
            all_results.insert(result.chunk_id, result);
        }

        // 填充BM25搜索结果
        for (result, norm_score) in bm25_results.into_iter().zip(normalized_bm25.into_iter()) {
            bm25_map.insert(result.chunk_id, norm_score);
            all_results.insert(result.chunk_id, result);
        }

        // 3. 计算混合分数
        let mut hybrid_results = Vec::new();
        for (chunk_id, search_result) in all_results {
            let vector_score = vector_map.get(&chunk_id).copied();
            let bm25_score = bm25_map.get(&chunk_id).copied();

            // 计算加权合并分数
            let combined_score = self.calculate_combined_score(
                vector_score,
                bm25_score,
                config,
            );

            hybrid_results.push(HybridSearchResult {
                combined_score,
                search_result,
            });
        }

        // 4. 按合并分数排序
        hybrid_results.sort_by(|a, b| b.combined_score.partial_cmp(&a.combined_score).unwrap());

        Ok(hybrid_results)
    }

    /// 归一化分数到[0,1]区间
    fn normalize_scores(&self, results: &[SearchResult]) -> Vec<f32> {
        if results.is_empty() {
            return Vec::new();
        }

        let scores: Vec<f32> = results.iter().map(|r| r.similarity_score).collect();
        let min_score = scores.iter().fold(f32::INFINITY, |a, &b| a.min(b));
        let max_score = scores.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));

        if (max_score - min_score).abs() < f32::EPSILON {
            // 所有分数相同，返回均匀分数
            return vec![1.0; results.len()];
        }

        // Min-Max归一化
        scores
            .into_iter()
            .map(|score| (score - min_score) / (max_score - min_score))
            .collect()
    }

    /// 计算加权合并分数
    fn calculate_combined_score(
        &self,
        vector_score: Option<f32>,
        bm25_score: Option<f32>,
        config: &HybridSearchConfig,
    ) -> f32 {
        match (vector_score, bm25_score) {
            (Some(v_score), Some(b_score)) => {
                // 两种搜索都有结果，使用加权平均
                config.vector_weight * v_score + config.bm25_weight * b_score
            }
            (Some(v_score), None) => {
                // 只有向量搜索有结果
                config.vector_weight * v_score
            }
            (None, Some(b_score)) => {
                // 只有BM25搜索有结果
                config.bm25_weight * b_score
            }
            (None, None) => {
                // 不应该发生，但返回0分
                0.0
            }
        }
    }

    // 移除了未使用的get_search_stats方法
}

// 移除了未使用的SearchStats结构体
