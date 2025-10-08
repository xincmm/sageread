use std::collections::HashMap;

/// 文本清理和规范化工具
pub struct TextSanitizer;

impl TextSanitizer {
    /// 创建新的文本清理器
    pub fn new() -> Self {
        Self
    }



    /// 清理HTML内容，提取纯文本
    pub fn clean_html_content(html: &str) -> String {
        // 移除HTML标签的简单实现
        let mut result = String::new();
        let mut in_tag = false;
        let mut chars = html.chars().peekable();

        while let Some(ch) = chars.next() {
            match ch {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(ch),
                _ => {}
            }
        }

        // 清理多余的空白字符
        result
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// HTML实体解码
    pub fn decode_html_entities(text: &str) -> String {
        let entities: HashMap<&str, &str> = [
            // 基本HTML实体
            ("&amp;", "&"),
            ("&lt;", "<"),
            ("&gt;", ">"),
            ("&quot;", "\""),
            ("&apos;", "'"),
            ("&nbsp;", " "),
            // 常见标点符号
            ("&#8220;", "\u{201C}"),
            ("&ldquo;", "\u{201C}"),
            ("&#8221;", "\u{201D}"),
            ("&rdquo;", "\u{201D}"),
            ("&#8216;", "\u{2018}"),
            ("&lsquo;", "\u{2018}"),
            ("&#8217;", "\u{2019}"),
            ("&rsquo;", "\u{2019}"),
            ("&#8212;", "\u{2014}"),
            ("&mdash;", "\u{2014}"),
            ("&#8211;", "\u{2013}"),
            ("&ndash;", "\u{2013}"),
            ("&#8230;", "\u{2026}"),
            ("&hellip;", "\u{2026}"),
            // 其他常见实体
            ("&copy;", "\u{00A9}"),
            ("&reg;", "\u{00AE}"),
            ("&trade;", "\u{2122}"),
            ("&deg;", "\u{00B0}"),
            ("&middot;", "\u{00B7}"),
            ("&bull;", "\u{2022}"),
            ("&sect;", "\u{00A7}"),
            ("&para;", "\u{00B6}"),
        ]
        .iter()
        .cloned()
        .collect();

        let mut result = text.to_string();

        // 替换命名实体
        for (entity, replacement) in entities {
            result = result.replace(entity, replacement);
        }

        // 处理数字实体 &#数字; 格式
        let re = regex::Regex::new(r"&#(\d+);").unwrap();
        result = re
            .replace_all(&result, |caps: &regex::Captures| {
                if let Ok(num) = caps[1].parse::<u32>() {
                    if let Some(ch) = char::from_u32(num) {
                        return ch.to_string();
                    }
                }
                caps[0].to_string() // 如果无法解析，保持原样
            })
            .to_string();

        // 处理十六进制实体 &#x十六进制; 格式
        let re = regex::Regex::new(r"&#x([0-9a-fA-F]+);").unwrap();
        result = re
            .replace_all(&result, |caps: &regex::Captures| {
                if let Ok(num) = u32::from_str_radix(&caps[1], 16) {
                    if let Some(ch) = char::from_u32(num) {
                        return ch.to_string();
                    }
                }
                caps[0].to_string() // 如果无法解析，保持原样
            })
            .to_string();

        result
    }

    /// 规范化空白字符
    pub fn normalize_whitespace(text: &str) -> String {
        // 将多个空白字符替换为单个空格
        let re = regex::Regex::new(r"\s+").unwrap();
        let normalized = re.replace_all(text, " ");
        
        // 清理多余的换行
        let re = regex::Regex::new(r"\n\s*\n").unwrap();
        let result = re.replace_all(&normalized, "\n");
        
        result.trim().to_string()
    }




}

impl Default for TextSanitizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(TextSanitizer::sanitize_filename("normal_file.txt"), "normal_file.txt");
        assert_eq!(TextSanitizer::sanitize_filename("file/with\\bad:chars"), "file_with_bad_chars");
        assert_eq!(TextSanitizer::sanitize_filename("file*with?quotes\""), "file_with_quotes_");
        assert_eq!(TextSanitizer::sanitize_filename("file<with>pipes|"), "file_with_pipes_");
    }

    #[test]
    fn test_clean_html_content() {
        let html = "<p>Hello <b>world</b>!</p>";
        let cleaned = TextSanitizer::clean_html_content(html);
        assert_eq!(cleaned, "Hello world!");
    }

    #[test]
    fn test_decode_html_entities() {
        let text = "&amp; &lt; &gt; &quot;";
        let decoded = TextSanitizer::decode_html_entities(text);
        assert_eq!(decoded, "& < > \"");
    }

    #[test]
    fn test_normalize_whitespace() {
        let text = "Hello    world\n\n\nTest";
        let normalized = TextSanitizer::normalize_whitespace(text);
        assert_eq!(normalized, "Hello world\nTest");
    }

    #[test]
    fn test_has_meaningful_content() {
        assert!(TextSanitizer::has_meaningful_content("Hello world"));
        assert!(TextSanitizer::has_meaningful_content("123"));
        assert!(!TextSanitizer::has_meaningful_content("   "));
        assert!(!TextSanitizer::has_meaningful_content("!@#$%"));
    }

    #[test]
    fn test_extract_summary() {
        let text = "First sentence. Second sentence! Third sentence? Fourth sentence.";
        let summary = TextSanitizer::extract_summary(text, 2);
        assert_eq!(summary, "First sentence. Second sentence!");
    }

    #[test]
    fn test_truncate_at_word_boundary() {
        let text = "This is a long sentence that needs to be truncated";
        let truncated = TextSanitizer::truncate_at_word_boundary(text, 20);
        assert!(truncated.len() <= 23); // 20 + "..."
        assert!(truncated.ends_with("..."));
        assert!(!truncated.contains("truncat")); // 应该在单词边界截断
    }
}
