/// 文本处理相关的常量配置

/// 分片的最大 token 数量
/// 必须小于向量化 API 的限制（通常是 512），留有足够的安全边距
pub const MAX_CHUNK_TOKENS: usize = 300;

/// 分片的最小 token 数量  
pub const MIN_CHUNK_TOKENS: usize = 50;

/// 分片重叠比例（20%）
pub const CHUNK_OVERLAP_RATIO: f32 = 0.2;

