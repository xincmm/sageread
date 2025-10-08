/// EPUB章节数据结构
#[derive(Debug, Clone)]
pub struct EpubChapter {
    pub title: String,
    pub content: String,
    pub order: usize,
}

/// EPUB内容数据结构
#[derive(Debug)]
pub struct EpubContent {
    pub title: String,
    pub author: String,
    pub chapters: Vec<EpubChapter>,
}

/// TOC节点数据结构
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TocNode {
    pub id: String,
    pub play_order: u32,
    pub title: String,
    pub src: String,
    pub children: Vec<TocNode>,
}

/// 扁平化的TOC节点
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FlatTocNode {
    pub id: String,
    pub play_order: u32,
    pub title: String,
    pub md_src: String,  // 转换后的 MD 文件路径（不包含锚点）
    pub depth: u32,      // 节点深度，从0开始
    #[serde(default)]
    pub anchor: Option<String>, // 原始 src 的锚点（如果有）
    #[serde(default)]
    pub hierarchy_path: Vec<String>, // 完整的层级路径，包含所有父级标题
}

/// 书籍元数据文件结构
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct BookMetadataFile {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub published: Option<String>,
    #[serde(default)]
    pub publisher: Option<String>,
    #[serde(default)]
    pub author: Option<AuthorField>,
    #[serde(default)]
    pub base_dir: Option<String>,
}

/// 作者字段，支持多种格式
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
pub enum AuthorField {
    String(String),
    Person(PersonAuthor),
    List(Vec<PersonAuthor>),
}

/// 人员作者信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
pub struct PersonAuthor {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default, rename = "sortAs")]
    pub sort_as: Option<String>,
}
