use crate::models::{SearchMode, HybridSearchConfig};

/// 简化的搜索配置
#[derive(Debug, Clone)]
pub struct SimpleSearchConfig {
    /// 默认向量权重
    pub default_vector_weight: f32,
    /// 默认BM25权重
    pub default_bm25_weight: f32,
    /// BM25 k1参数（词频饱和度）
    pub bm25_k1: f32,
    /// BM25 b参数（文档长度归一化）
    pub bm25_b: f32,
    /// 是否启用智能权重调整
    pub enable_smart_weights: bool,
}

impl Default for SimpleSearchConfig {
    fn default() -> Self {
        Self {
            default_vector_weight: 0.7,
            default_bm25_weight: 0.3,
            bm25_k1: 1.2,  // 标准BM25参数
            bm25_b: 0.75,  // 标准BM25参数
            enable_smart_weights: true,
        }
    }
}

impl SimpleSearchConfig {
    /// 创建HybridSearchConfig
    pub fn to_hybrid_config(&self, mode: Option<SearchMode>) -> HybridSearchConfig {
        HybridSearchConfig {
            mode: mode.unwrap_or(SearchMode::Hybrid),
            vector_weight: self.default_vector_weight,
            bm25_weight: self.default_bm25_weight,
            k1: self.bm25_k1,
            b: self.bm25_b,
        }
    }

    /// 智能权重调整：根据查询特征自动优化权重
    pub fn get_smart_config(&self, query: &str) -> HybridSearchConfig {
        if !self.enable_smart_weights {
            return self.to_hybrid_config(None);
        }

        let word_count = query.split_whitespace().count();
        let query_len = query.len();

        let (vector_weight, bm25_weight) = if word_count <= 2 || query_len < 10 {
            // 短查询：偏重关键词匹配
            (0.4, 0.6)
        } else if word_count > 10 || query_len > 100 {
            // 长查询：偏重语义理解
            (0.8, 0.2)
        } else {
            // 中等查询：使用默认权重
            (self.default_vector_weight, self.default_bm25_weight)
        };

        HybridSearchConfig {
            mode: SearchMode::Hybrid,
            vector_weight,
            bm25_weight,
            k1: self.bm25_k1,
            b: self.bm25_b,
        }
    }
}

/// 全局配置实例
static SEARCH_CONFIG: std::sync::OnceLock<SimpleSearchConfig> = std::sync::OnceLock::new();

/// 获取全局搜索配置
pub fn get_search_config() -> &'static SimpleSearchConfig {
    SEARCH_CONFIG.get_or_init(|| SimpleSearchConfig::default())
}

// 移除了未使用的get_default_hybrid_config函数

/// 获取智能推荐的混合搜索配置
pub fn get_smart_hybrid_config(query: &str) -> HybridSearchConfig {
    get_search_config().get_smart_config(query)
}

/// 创建自定义混合搜索配置
pub fn create_custom_hybrid_config(
    mode: Option<SearchMode>,
    vector_weight: Option<f32>,
    bm25_weight: Option<f32>,
) -> HybridSearchConfig {
    let base_config = get_search_config();
    let mut config = base_config.to_hybrid_config(mode);

    if let (Some(vw), Some(bw)) = (vector_weight, bm25_weight) {
        // 归一化权重
        let total = vw + bw;
        if total > 0.0 {
            config.vector_weight = vw / total;
            config.bm25_weight = bw / total;
        }
    }

    config
}
