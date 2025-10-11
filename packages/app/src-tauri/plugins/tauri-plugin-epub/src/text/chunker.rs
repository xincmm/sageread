use anyhow::Result;
use crate::text::{TextTokenizer, MAX_CHUNK_TOKENS, CHUNK_OVERLAP_RATIO};

/// 文本分块器，负责将长文本分割成适合处理的小块
pub struct TextChunker {
    tokenizer: TextTokenizer,
}

impl TextChunker {
    /// 创建新的文本分块器
    pub fn new() -> Result<Self> {
        let tokenizer = TextTokenizer::new()?;
        Ok(Self { tokenizer })
    }

    /// 估算文本的token数量
    pub fn estimate_tokens(&self, text: &str) -> usize {
        self.tokenizer.estimate_tokens(text)
    }



    /// 按 token 数量和行边界分割文本，带重叠
    pub fn chunk_text_by_tokens(
        &self,
        text: &str,
        min_tokens: usize,
        max_tokens: usize,
        _overlap: usize,
    ) -> Vec<String> {
        let safe_max_tokens = max_tokens.min(MAX_CHUNK_TOKENS);
        let overlap_tokens = (safe_max_tokens as f32 * CHUNK_OVERLAP_RATIO) as usize;

        let lines: Vec<&str> = text.lines().collect();
        let mut chunks = Vec::new();
        let mut all_lines_with_tokens: Vec<(String, usize)> = Vec::new();

        // 预处理所有行，计算token数量
        for line in lines {
            let line = line.trim();
            if !line.is_empty() {
                let tokens = self.estimate_tokens(line);
                all_lines_with_tokens.push((line.to_string(), tokens));
            }
        }

        if all_lines_with_tokens.is_empty() {
            return chunks;
        }

        let mut start_idx = 0;

        while start_idx < all_lines_with_tokens.len() {
            let mut current_chunk = Vec::new();
            let mut current_tokens = 0;
            let mut end_idx = start_idx;

            // 从start_idx开始，尽可能多地添加行，直到达到safe_max_tokens
            while end_idx < all_lines_with_tokens.len() {
                let (line, line_tokens) = &all_lines_with_tokens[end_idx];

                // 如果单行就超过限制，需要特殊处理
                if *line_tokens > safe_max_tokens {
                    // 如果当前块不为空，先保存
                    if !current_chunk.is_empty() {
                        chunks.push(current_chunk.join("\n"));
                        current_chunk.clear();
                        current_tokens = 0;
                    }

                    // 分割这一行
                    let line_chunks = self.split_long_line(line, min_tokens, safe_max_tokens);
                    chunks.extend(line_chunks);
                    end_idx += 1;
                    break;
                }

                // 如果添加这一行会超过限制，并且当前块已经达到最小要求
                if current_tokens + line_tokens > safe_max_tokens && current_tokens >= min_tokens {
                    break;
                }

                current_chunk.push(line.clone());
                current_tokens += line_tokens;
                end_idx += 1;
            }

            // 保存当前块（如果有内容且满足最小要求）
            if !current_chunk.is_empty() && current_tokens >= min_tokens.min(100) {
                chunks.push(current_chunk.join("\n"));
            }

            // 计算下一个块的起始位置（带重叠）
            if end_idx >= all_lines_with_tokens.len() {
                break;
            }

            // 找到重叠的起始位置
            let mut overlap_start = start_idx;
            let mut overlap_tokens_count = 0;

            for i in (start_idx..end_idx).rev() {
                overlap_tokens_count += all_lines_with_tokens[i].1;
                if overlap_tokens_count >= overlap_tokens {
                    overlap_start = i;
                    break;
                }
            }

            start_idx = overlap_start.max(start_idx + 1);
        }

        chunks
    }

    /// 专门用于 Markdown 文件的智能分块方法
    /// 考虑 Markdown 格式特性：标题层级、段落边界、代码块等
    pub fn chunk_md_file(&self, md_content: &str, min_tokens: usize, max_tokens: usize) -> Vec<String> {
        let safe_max_tokens = max_tokens.min(MAX_CHUNK_TOKENS);
        
        // 首先尝试按 Markdown 结构分块
        if let Some(structured_chunks) = self.chunk_by_markdown_structure(md_content, min_tokens, safe_max_tokens) {
            return structured_chunks;
        }
        
        // 如果结构化分块失败，回退到标准文本分块
        log::debug!("Markdown structured chunking failed, falling back to text chunking");
        self.chunk_text_by_tokens(md_content, min_tokens, safe_max_tokens, 0)
    }
    
    /// 按 Markdown 结构进行智能分块
    fn chunk_by_markdown_structure(&self, md_content: &str, min_tokens: usize, max_tokens: usize) -> Option<Vec<String>> {
        let lines: Vec<&str> = md_content.lines().collect();
        if lines.is_empty() {
            return Some(vec![]);
        }
        
        let mut chunks = Vec::new();
        let mut current_section = Vec::new();
        let mut current_tokens = 0;
        let overlap_tokens = (max_tokens as f32 * CHUNK_OVERLAP_RATIO) as usize;
        
        for line in lines.iter() {
            let line = line.trim();
            let line_tokens = self.estimate_tokens(line);
            
            // 检查是否是 Markdown 标题
            let is_header = line.starts_with('#') && line.len() > 1;
            
            // 检查是否达到理想分块大小（75% of max_tokens）
            let approaching_limit = current_tokens >= (max_tokens * 3 / 4);
            
            // 检查行数是否过多（避免过长段落）
            let too_many_lines = current_section.len() >= 50;
            
            // 多种分块触发条件
            let should_consider_split = (is_header || approaching_limit || too_many_lines) 
                && !current_section.is_empty() 
                && current_tokens >= min_tokens;
            
            if should_consider_split {
                // 检查如果添加这个标题会不会超过限制
                if current_tokens + line_tokens > max_tokens {
                    // 保存当前段落
                    chunks.push(current_section.join("\n"));
                    
                    // 准备重叠内容
                    let overlap_content = self.prepare_overlap_content(&current_section, overlap_tokens);
                    current_section = overlap_content;
                    current_tokens = current_section.iter()
                        .map(|l| self.estimate_tokens(l))
                        .sum();
                }
            }
            
            // 检查代码块边界
            if line.starts_with("```") && !current_section.is_empty() {
                // 代码块应该保持完整，如果当前块很大，先分块
                if current_tokens >= min_tokens && current_tokens + line_tokens > max_tokens {
                    chunks.push(current_section.join("\n"));
                    current_section.clear();
                    current_tokens = 0;
                }
            }
            
            // 添加当前行
            if !line.is_empty() || current_section.len() > 0 {  // 保留非空行或作为段落分隔
                current_section.push(line.to_string());
                current_tokens += line_tokens;
            }
            
            // 检查是否达到最大 token 限制
            if current_tokens > max_tokens && current_section.len() > 1 {
                // 需要分块，但尽量在合适的边界
                if let Some(split_point) = self.find_best_split_point(&current_section, min_tokens, max_tokens) {
                    let chunk_lines = current_section[..split_point].to_vec();
                    chunks.push(chunk_lines.join("\n"));
                    
                    // 准备重叠内容
                    let overlap_content = self.prepare_overlap_content(&chunk_lines, overlap_tokens);
                    let remaining_lines = current_section[split_point..].to_vec();
                    current_section = [overlap_content, remaining_lines].concat();
                    current_tokens = current_section.iter()
                        .map(|l| self.estimate_tokens(l))
                        .sum();
                } else {
                    // 如果找不到合适的分割点，强制分割
                    let mid = current_section.len() / 2;
                    let chunk_lines = current_section[..mid].to_vec();
                    chunks.push(chunk_lines.join("\n"));
                    current_section = current_section[mid..].to_vec();
                    current_tokens = current_section.iter()
                        .map(|l| self.estimate_tokens(l))
                        .sum();
                }
            }
        }
        
        // 处理最后一个段落，确保不超过token限制
        if !current_section.is_empty() && current_tokens >= min_tokens.min(50) {
            // 检查是否超过限制，如果超过则需要分割
            if current_tokens > max_tokens && current_section.len() > 1 {
                if let Some(split_point) = self.find_best_split_point(&current_section, min_tokens, max_tokens) {
                    let chunk_lines = current_section[..split_point].to_vec();
                    chunks.push(chunk_lines.join("\n"));
                    
                    // 处理剩余部分
                    let remaining_lines = current_section[split_point..].to_vec();
                    if !remaining_lines.is_empty() {
                        let remaining_tokens: usize = remaining_lines.iter()
                            .map(|l| self.estimate_tokens(l))
                            .sum();
                        if remaining_tokens >= min_tokens.min(30) {
                            chunks.push(remaining_lines.join("\n"));
                        }
                    }
                } else {
                    // 强制分割
                    let mid = current_section.len() / 2;
                    let chunk_lines = current_section[..mid].to_vec();
                    chunks.push(chunk_lines.join("\n"));
                    
                    let remaining_lines = current_section[mid..].to_vec();
                    if !remaining_lines.is_empty() {
                        chunks.push(remaining_lines.join("\n"));
                    }
                }
            } else {
                chunks.push(current_section.join("\n"));
            }
        }
        
        // 过滤掉过短的块，并确保不超过最大token限制
        let filtered_chunks: Vec<String> = chunks.into_iter()
            .filter(|chunk| !chunk.trim().is_empty() && self.estimate_tokens(chunk) >= min_tokens.min(30))
            .flat_map(|chunk| {
                let chunk_tokens = self.estimate_tokens(&chunk);
                if chunk_tokens > max_tokens {
                    // 如果仍然超过限制，进行紧急分割
                    // log::warn!("检测到超长分片({} tokens)，进行紧急分割", chunk_tokens);
                    self.emergency_split_chunk(&chunk, max_tokens)
                } else {
                    vec![chunk]
                }
            })
            .collect();
        
        if filtered_chunks.is_empty() {
            None
        } else {
            Some(filtered_chunks)
        }
    }

    /// 寻找最佳的分割点（段落结束、列表项等）
    fn find_best_split_point(&self, lines: &[String], min_tokens: usize, max_tokens: usize) -> Option<usize> {
        let mut best_point = None;
        let mut accumulated_tokens = 0;

        for (i, line) in lines.iter().enumerate() {
            accumulated_tokens += self.estimate_tokens(line);

            // 如果还没达到最小要求，继续
            if accumulated_tokens < min_tokens {
                continue;
            }

            // 检查分割点优先级
            // 优先级1：理想分割点（标题、代码块边界）
            let is_ideal_split = line.starts_with('#')               // 标题
                || line.starts_with("```");                         // 代码块
            
            // 优先级2：良好分割点（空行、句子结尾）
            let is_good_split = line.trim().is_empty()               // 空行
                || line.trim().ends_with('.')                       // 英文句号
                || line.trim().ends_with('!')                       // 英文感叹号  
                || line.trim().ends_with('?')                       // 英文问号
                || line.trim().ends_with('。')                      // 中文句号
                || line.trim().ends_with('！')                      // 中文感叹号
                || line.trim().ends_with('？');                     // 中文问号
            
            // 优先级3：可接受分割点（列表、引用等）
            let is_acceptable_split = line.starts_with('-')          // 列表项
                || line.starts_with('*')                            // 列表项  
                || line.starts_with('>')                            // 引用
                || line.trim().starts_with(char::is_numeric)        // 数字开头
                || line.contains("---");                            // 分隔符

            // 根据优先级选择分割点
            if is_ideal_split || is_good_split || is_acceptable_split {
                best_point = Some(i + 1);

                // 理想分割点：立即使用
                if is_ideal_split {
                    break;
                }
                
                // 良好分割点：超过理想长度时使用
                if is_good_split && accumulated_tokens >= max_tokens * 3 / 4 {
                    break;
                }
                
                // 可接受分割点：接近最大长度时使用
                if is_acceptable_split && accumulated_tokens >= max_tokens * 9 / 10 {
                    break;
                }
            }

            // 如果超过最大限制，必须分割
            if accumulated_tokens >= max_tokens {
                break;
            }
        }

        best_point
    }

    /// 准备重叠内容 - 智能选择语义边界
    fn prepare_overlap_content(&self, lines: &[String], max_overlap_tokens: usize) -> Vec<String> {
        if lines.is_empty() {
            return Vec::new();
        }
        
        // 最小重叠：至少尝试包含一个完整句子
        let min_overlap_tokens = (max_overlap_tokens as f32 * 0.3) as usize; // 30%最小值
        
        // 首先尝试智能边界选择
        if let Some(smart_overlap) = self.select_smart_overlap_boundary(lines, max_overlap_tokens, min_overlap_tokens) {
            return smart_overlap;
        }
        
        // 兜底：使用原有的逐行收集逻辑
        let mut overlap_content = Vec::new();
        let mut overlap_tokens = 0;

        for line in lines.iter().rev() {
            let line_tokens = self.estimate_tokens(line);
            if overlap_tokens + line_tokens <= max_overlap_tokens {
                overlap_content.insert(0, line.clone());
                overlap_tokens += line_tokens;
            } else {
                break;
            }
        }

        overlap_content
    }
    
    /// 智能选择重叠边界，优先选择语义完整的内容
    fn select_smart_overlap_boundary(&self, lines: &[String], max_overlap_tokens: usize, min_overlap_tokens: usize) -> Option<Vec<String>> {
        // 从末尾开始寻找最佳重叠边界
        let mut best_overlap = None;
        let mut current_tokens = 0;
        let mut current_lines = Vec::new();
        
        for line in lines.iter().rev() {
            let line_tokens = self.estimate_tokens(line);
            let new_total = current_tokens + line_tokens;
            
            // 如果超过最大限制，停止
            if new_total > max_overlap_tokens {
                break;
            }
            
            current_lines.insert(0, line.clone());
            current_tokens = new_total;
            
            // 检查当前行是否是好的边界点
            let is_good_boundary = self.is_good_overlap_boundary(line);
            
            // 如果是好的边界点且满足最小要求，记录为候选
            if is_good_boundary && current_tokens >= min_overlap_tokens {
                best_overlap = Some(current_lines.clone());
                // 如果找到句子结尾等优质边界，可以优先选择
                if self.is_sentence_ending(line) {
                    break; // 优先选择句子结尾
                }
            }
        }
        
        best_overlap
    }
    
    /// 判断是否是好的重叠边界
    fn is_good_overlap_boundary(&self, line: &str) -> bool {
        let trimmed = line.trim();
        
        // 空行是很好的边界
        if trimmed.is_empty() {
            return true;
        }
        
        // 句子结尾是最好的边界
        if self.is_sentence_ending(line) {
            return true;
        }
        
        // 段落开始（标题、列表等）
        if trimmed.starts_with('#') || trimmed.starts_with('-') || trimmed.starts_with('*') {
            return true;
        }
        
        // 数字开头的行（可能是编号段落）
        if trimmed.chars().next().map_or(false, |c| c.is_ascii_digit()) {
            return true;
        }
        
        false
    }
    
    /// 判断是否是句子结尾
    fn is_sentence_ending(&self, line: &str) -> bool {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            return false;
        }
        
        // 中英文句子结尾标点
        let sentence_endings = ['。', '！', '？', '.', '!', '?'];
        sentence_endings.iter().any(|&ending| trimmed.ends_with(ending))
    }

    /// 将一行很长的文本进一步分割为若干子块，优先按句子，其次按字符带重叠
    fn split_long_line(&self, line: &str, min_tokens: usize, max_tokens: usize) -> Vec<String> {
        let sentences = self.split_into_sentences(line);
        // 如果无法有效分句，退化为按字符分割
        if sentences.len() <= 1 {
            return self.split_by_characters(line, max_tokens);
        }

        let overlap_tokens = (max_tokens as f32 * CHUNK_OVERLAP_RATIO) as usize;
        let mut chunks: Vec<String> = Vec::new();
        let mut current_chunk: Vec<String> = Vec::new();
        let mut current_tokens: usize = 0;

        for sentence in sentences {
            let tokens = self.estimate_tokens(&sentence);
            if tokens > max_tokens {
                // 先把已有的块输出
                if !current_chunk.is_empty() {
                    chunks.push(current_chunk.join(""));
                    current_chunk.clear();
                    current_tokens = 0;
                }
                // 超长句子按字符切分
                let char_chunks = self.split_by_characters_with_overlap(
                    &sentence,
                    max_tokens,
                    (max_tokens as f32 * 0.2 * 0.8) as usize,
                );
                chunks.extend(char_chunks);
                continue;
            }

            if current_tokens + tokens > max_tokens && current_tokens >= min_tokens {
                // 关闭当前块
                chunks.push(current_chunk.join(""));
                // 准备重叠：从尾部回退若干句子形成重叠
                let mut overlap_vec: Vec<String> = Vec::new();
                let mut acc = 0usize;
                for s in current_chunk.iter().rev() {
                    let t = self.estimate_tokens(s);
                    if acc + t > overlap_tokens {
                        break;
                    }
                    acc += t;
                    overlap_vec.push(s.clone());
                }
                overlap_vec.reverse();
                current_chunk = overlap_vec;
                current_tokens = current_chunk.iter().map(|s| self.estimate_tokens(s)).sum();
            }

            current_chunk.push(sentence);
            current_tokens += tokens;
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk.join(""));
        }

        chunks
    }

    /// 将文本分割成句子
    fn split_into_sentences(&self, text: &str) -> Vec<String> {
        // 按中文和英文的句子结束符分割
        let sentence_endings = ['。', '！', '？', '.', '!', '?'];
        let mut sentences = Vec::new();
        let mut current_sentence = String::new();

        for ch in text.chars() {
            current_sentence.push(ch);

            if sentence_endings.contains(&ch) {
                sentences.push(current_sentence.trim().to_string());
                current_sentence.clear();
            }
        }

        // 添加剩余的文本
        if !current_sentence.trim().is_empty() {
            sentences.push(current_sentence.trim().to_string());
        }

        sentences.into_iter().filter(|s| !s.is_empty()).collect()
    }

    /// 按字符数量分割文本（最后的手段）
    fn split_by_characters(&self, text: &str, max_tokens: usize) -> Vec<String> {
        let overlap_chars = (max_tokens as f32 * CHUNK_OVERLAP_RATIO * 0.8) as usize; // 20%重叠，0.8是安全系数
        self.split_by_characters_with_overlap(text, max_tokens, overlap_chars)
    }

    /// 紧急分割超长分片，确保不超过max_tokens，带重叠
    fn emergency_split_chunk(&self, chunk: &str, max_tokens: usize) -> Vec<String> {
        let lines: Vec<&str> = chunk.lines().collect();
        if lines.len() <= 1 {
            // 单行超长，按字符分割（已有重叠机制）
            return self.split_by_characters(chunk, max_tokens);
        }
        
        let overlap_tokens = (max_tokens as f32 * CHUNK_OVERLAP_RATIO) as usize;
        let mut result = Vec::new();
        let mut current_lines = Vec::new();
        let mut current_tokens = 0;
        
        for line in lines {
            let line_tokens = self.estimate_tokens(line);
            
            // 如果添加这行会超过限制
            if current_tokens + line_tokens > max_tokens && !current_lines.is_empty() {
                // 保存当前分片
                result.push(current_lines.join("\n"));
                
                // 准备重叠内容
                let overlap_content = self.prepare_overlap_content(&current_lines, overlap_tokens);
                current_lines = overlap_content;
                current_tokens = current_lines.iter()
                    .map(|l| self.estimate_tokens(l))
                    .sum();
            }
            
            // 如果单行就超过限制，需要进一步分割
            if line_tokens > max_tokens {
                if !current_lines.is_empty() {
                    result.push(current_lines.join("\n"));
                    current_lines.clear();
                    current_tokens = 0;
                }
                // 单行分割已有重叠机制
                result.extend(self.split_by_characters(line, max_tokens));
            } else {
                current_lines.push(line.to_string());
                current_tokens += line_tokens;
            }
        }
        
        if !current_lines.is_empty() {
            result.push(current_lines.join("\n"));
        }
        
        result
    }

    /// 按字符数量分割文本，带重叠
    fn split_by_characters_with_overlap(
        &self,
        text: &str,
        max_tokens: usize,
        overlap_chars: usize,
    ) -> Vec<String> {
        let chars: Vec<char> = text.chars().collect();
        let mut chunks = Vec::new();
        let chunk_size = (max_tokens as f32 * 0.8) as usize; // 留一些余量

        if chars.len() <= chunk_size {
            if !text.trim().is_empty() {
                chunks.push(text.to_string());
            }
            return chunks;
        }

        let mut start = 0;

        while start < chars.len() {
            let end = (start + chunk_size).min(chars.len());
            let chunk_chars = &chars[start..end];
            let chunk: String = chunk_chars.iter().collect();

            if !chunk.trim().is_empty() {
                chunks.push(chunk);
            }

            // 计算下一个块的起始位置（带重叠）
            if end >= chars.len() {
                break;
            }

            start = (end - overlap_chars).max(start + 1);
        }

        chunks
    }
}

impl Default for TextChunker {
    fn default() -> Self {
        Self::new().expect("Failed to initialize default text chunker")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunker_creation() {
        let chunker = TextChunker::new();
        assert!(chunker.is_ok());
    }

    #[test]
    fn test_basic_chunking() {
        let chunker = TextChunker::new().unwrap();
        let text = "This is a test.\nThis is another line.\nAnd one more line.";
        let chunks = chunker.chunk_text(text, 100, 0);

        assert!(!chunks.is_empty());
        // 所有块合起来应该包含原始内容的主要部分
        let combined = chunks.join(" ");
        assert!(combined.contains("test"));
    }

    #[test]
    fn test_markdown_chunking() {
        let chunker = TextChunker::new().unwrap();
        let md_text = "# Chapter 1\nThis is content.\n\n## Section 1.1\nMore content here.\n\n```code\nsome code\n```";
        let chunks = chunker.chunk_md_file(md_text, 10, 100);

        assert!(!chunks.is_empty());
        // 应该保持Markdown结构
        assert!(chunks.iter().any(|chunk| chunk.contains("# Chapter 1")));
    }

    #[test]
    fn test_sentence_splitting() {
        let chunker = TextChunker::new().unwrap();
        let text = "First sentence. Second sentence! Third sentence?";
        let sentences = chunker.split_into_sentences(text);

        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "First sentence.");
        assert_eq!(sentences[1], "Second sentence!");
        assert_eq!(sentences[2], "Third sentence?");
    }
}
