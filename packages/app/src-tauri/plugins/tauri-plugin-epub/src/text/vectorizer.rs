use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tiktoken_rs::o200k_base;

use crate::models::VectorizerConfig;

#[derive(Serialize)]
struct EmbeddingRequest {
    input: Vec<String>,
    model: String,
    encoding_format: String,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

// Removed Usage: only `data` is required

pub struct TextVectorizer {
    client: Client,
    api_key: Option<String>,
    model_name: String,
    embeddings_url: String,
    tokenizer: tiktoken_rs::CoreBPE,
    embedding_dimension: Option<usize>, // 缓存检测到的维度
}



impl TextVectorizer {
    /// 创建新的文本向量化器
    pub async fn new(config: VectorizerConfig) -> Result<Self> {
        log::info!("初始化嵌入 API 向量化器: embeddings_url={}, model={}", config.embeddings_url, config.model_name);

        let client = Client::new();
        let tokenizer = o200k_base().context("Failed to initialize tiktoken tokenizer")?;

        Ok(Self {
            client,
            api_key: config.api_key,
            model_name: config.model_name,
            embeddings_url: config.embeddings_url,
            tokenizer,
            embedding_dimension: None, // 初始化时未知，首次调用时检测
        })
    }

    /// 将文本转换为向量
    pub async fn vectorize_text(&mut self, text: &str) -> Result<Vec<f32>> {
        // 按 token 数量截断，避免超过后端上下文窗口
        // 预留安全边界，假设后端窗口至少 512（llama.cpp 默认可调），这里取 480 tokens
        let max_tokens: usize = 480;
        let tokens = self.tokenizer.encode_with_special_tokens(text);
        let processed_text = if tokens.len() > max_tokens {
            log::warn!(
                "文本过长 ({} tokens)，按 token 截断到 {} tokens",
                tokens.len(),
                max_tokens
            );
            let preview = text.chars().take(120).collect::<String>();
            log::debug!("原文本预览(120)：{}", preview);
            let clipped = &tokens[..max_tokens];
            // 将截断后的 token 反解码为字符串
            self.tokenizer.decode(clipped.to_vec())
                .unwrap_or_else(|_| text.chars().take(1000).collect::<String>())
        } else {
            text.to_string()
        };

        let request = EmbeddingRequest {
            input: vec![processed_text],
            model: self.model_name.clone(),
            encoding_format: "float".to_string(),
        };

        let mut req = self.client.post(&self.embeddings_url).header("Content-Type", "application/json").json(&request);
        if let Some(k) = &self.api_key { req = req.header("Authorization", format!("Bearer {}", k)); }
        let response = req
            .send()
            .await
            .context("Failed to send request to local embedding API")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Local embedding API error: {}", error_text);
        }

        let embedding_response: EmbeddingResponse = response
            .json()
            .await
            .context("Failed to parse local embedding API response")?;

        if embedding_response.data.is_empty() {
            anyhow::bail!("No embeddings returned from local embedding API");
        }

        let embedding = embedding_response.data[0].embedding.clone();

        // 首次调用时检测并缓存维度
        if self.embedding_dimension.is_none() {
            let detected_dimension = embedding.len();
            log::info!("检测到向量维度: {}", detected_dimension);
            self.embedding_dimension = Some(detected_dimension);
        }

        Ok(embedding)
    }



    /// 检测向量维度（通过发送测试文本）
    pub async fn detect_embedding_dimension(&mut self) -> Result<usize> {
        if let Some(dimension) = self.embedding_dimension {
            return Ok(dimension);
        }

        // 发送测试文本来检测维度
        let test_embedding = self.vectorize_text("test").await?;
        Ok(test_embedding.len())
    }
}
