use anyhow::{Context, Result};
use tiktoken_rs::o200k_base;

/// 文本Token化器，用于估算文本的token数量
pub struct TextTokenizer {
    tokenizer: tiktoken_rs::CoreBPE,
}

impl TextTokenizer {
    /// 创建新的Token化器
    pub fn new() -> Result<Self> {
        let tokenizer = o200k_base().context("Failed to initialize tiktoken tokenizer")?;
        Ok(Self { tokenizer })
    }

    /// 估算文本的token数量
    pub fn estimate_tokens(&self, text: &str) -> usize {
        self.tokenizer.encode_with_special_tokens(text).len()
    }
}

impl Default for TextTokenizer {
    fn default() -> Self {
        Self::new().expect("Failed to initialize default tokenizer")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenizer_creation() {
        let tokenizer = TextTokenizer::new();
        assert!(tokenizer.is_ok());
    }

    #[test]
    fn test_token_estimation() {
        let tokenizer = TextTokenizer::new().unwrap();
        let text = "Hello, world!";
        let token_count = tokenizer.estimate_tokens(text);
        assert!(token_count > 0);
        assert!(token_count < 10); // 应该是一个合理的数字
    }

    #[test]
    fn test_exceeds_limit() {
        let tokenizer = TextTokenizer::new().unwrap();
        let short_text = "Hello";
        let long_text = "This is a much longer text that should exceed the token limit when we set a very small limit for testing purposes.";
        
        assert!(!tokenizer.exceeds_limit(short_text, 100));
        assert!(tokenizer.exceeds_limit(long_text, 5));
    }

    #[test]
    fn test_truncate_to_tokens() {
        let tokenizer = TextTokenizer::new().unwrap();
        let text = "This is a test text that will be truncated.";
        let truncated = tokenizer.truncate_to_tokens(text, 5);
        
        // 截断后的文本应该更短
        assert!(truncated.len() <= text.len());
        // 截断后的token数量应该不超过限制
        assert!(tokenizer.estimate_tokens(&truncated) <= 5);
    }
}
