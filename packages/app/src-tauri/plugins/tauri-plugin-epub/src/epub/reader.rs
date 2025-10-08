use anyhow::{Context, Result};
use epub::doc::EpubDoc;
use std::path::Path;

use crate::models::{EpubChapter, EpubContent};
use crate::text::{TextChunker, TextSanitizer};

pub struct EpubReader {
    chunker: TextChunker,
}

impl EpubReader {
    pub fn new() -> Result<Self> {
        let chunker = TextChunker::new().context("Failed to initialize text chunker")?;

        Ok(Self {
            chunker,
        })
    }

    /// 读取 EPUB 文件并提取所有文本内容
    pub fn read_epub<P: AsRef<Path>>(&self, path: P) -> Result<EpubContent> {
        let mut doc = EpubDoc::new(path).context("Failed to open EPUB file")?;

        // 获取书籍基本信息
        let title = doc
            .mdata("title")
            .unwrap_or_else(|| "Unknown Title".to_string());
        let author = doc
            .mdata("creator")
            .or_else(|| doc.mdata("author"))
            .unwrap_or_else(|| "Unknown Author".to_string());

        log::info!("Reading EPUB: {} by {}", title, author);
        log::info!("EPUB spine length: {}", doc.spine.len());
        log::info!("EPUB resources count: {}", doc.resources.len());

        let mut chapters = Vec::new();
        let spine_len = doc.get_num_pages();

        for i in 0..spine_len {
            doc.set_current_page(i);

            // 获取当前页面的HTML内容
            let html_content = doc.get_current_str().unwrap_or_default();
            let html_str = &html_content.1; // 取元组的第二个元素（HTML内容）

            // 提取章节标题
            let chapter_title = self
                .extract_chapter_title(html_str)
                .unwrap_or_else(|| format!("Chapter {}", i + 1));

            // 提取并清理文本内容
            let content = self.extract_text_content(html_str).unwrap_or_default();

            if !content.trim().is_empty() {
                chapters.push(EpubChapter {
                    title: chapter_title,
                    content,
                    order: i,
                });
            }
        }

        log::info!("Extracted {} chapters", chapters.len());

        Ok(EpubContent {
            title,
            author,
            chapters,
        })
    }

    /// 从HTML内容中提取纯文本
    fn extract_text_content(&self, html: &str) -> Result<String> {
        let mut text = html.to_string();

        // 首先移除脚本和样式标签（包括其内容）
        let script_style_patterns = [
            r"(?is)<script[^>]*>.*?</script>",
            r"(?is)<style[^>]*>.*?</style>",
            r"(?is)<!--.*?-->", // 移除HTML注释
        ];

        for pattern in &script_style_patterns {
            let re = regex::Regex::new(pattern)?;
            text = re.replace_all(&text, " ").to_string();
        }

        // 处理块级元素，在它们周围添加换行
        let block_elements = [
            r"(?i)</?(div|p|h[1-6]|section|article|chapter|br)[^>]*>",
            r"(?i)</?(ul|ol|li|dl|dt|dd)[^>]*>",
            r"(?i)</?(table|tr|td|th)[^>]*>",
            r"(?i)</?(header|footer|nav|main|aside)[^>]*>",
        ];

        for pattern in &block_elements {
            let re = regex::Regex::new(pattern)?;
            text = re.replace_all(&text, "\n").to_string();
        }

        // 移除所有剩余的HTML标签
        let re = regex::Regex::new(r"<[^>]+>")?;
        text = re.replace_all(&text, " ").to_string();

        // 解码HTML实体
        text = TextSanitizer::decode_html_entities(&text);

        // 清理空白字符
        text = TextSanitizer::normalize_whitespace(&text);

        Ok(text)
    }

    /// 提取章节标题
    fn extract_chapter_title(&self, html: &str) -> Option<String> {
        // 尝试从标题标签中提取标题，按优先级排序
        let title_patterns = [
            r"(?is)<title[^>]*>(.*?)</title>",
            r"(?is)<h1[^>]*>(.*?)</h1>",
            r"(?is)<h2[^>]*>(.*?)</h2>",
            r"(?is)<h3[^>]*>(.*?)</h3>",
            r"(?is)<h4[^>]*>(.*?)</h4>",
            // 查找带有特定class的元素
            r#"(?is)<[^>]*class=\"[^\"]*title[^\"]*\"[^>]*>(.*?)</[^>]*>"#,
            r#"(?is)<[^>]*class=\"[^\"]*chapter[^\"]*\"[^>]*>(.*?)</[^>]*>"#,
        ];

        for pattern in &title_patterns {
            if let Ok(re) = regex::Regex::new(pattern) {
                if let Some(captures) = re.captures(html) {
                    if let Some(title_match) = captures.get(1) {
                        let title = title_match.as_str();
                        let clean_title = TextSanitizer::clean_html_content(title);
                        let clean_title = clean_title.trim();

                        // 过滤掉太短或太长的标题
                        if !clean_title.is_empty()
                            && clean_title.len() >= 1
                            && clean_title.len() <= 200
                        {
                            // 清理常见的无用标题
                            if !clean_title.to_lowercase().contains("untitled")
                                && !clean_title.to_lowercase().contains("unnamed")
                                && !clean_title
                                    .chars()
                                    .all(|c| c.is_numeric() || c.is_whitespace())
                            {
                                return Some(clean_title.to_string());
                            }
                        }
                    }
                }
            }
        }

        None
    }

    /// 专门用于 Markdown 文件的智能分块方法
    /// 考虑 Markdown 格式特性：标题层级、段落边界、代码块等
    pub fn chunk_md_file(&self, md_content: &str, min_tokens: usize, max_tokens: usize) -> Vec<String> {
        self.chunker.chunk_md_file(md_content, min_tokens, max_tokens)
    }
}
