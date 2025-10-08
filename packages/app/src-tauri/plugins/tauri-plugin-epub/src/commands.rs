use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

use crate::database::VectorDatabase;
use crate::epub::EpubReader;
use crate::pipeline::process_epub_to_db;
use crate::models::ProgressUpdate;
use crate::state::EpubState;
use crate::epub::{parse_toc_file, find_toc_ncx_in_mdbook, flatten_toc};
use crate::models::{
    DocumentChunk, ProcessOptions, VectorizerConfig, FlatTocNode,
    ParsedBook, IndexResult, MdbookResult
};
use epub2mdbook::convert_epub_to_mdbook;

/// Parse an EPUB under $AppData/books/{book_id} and return basic metadata.
#[tauri::command]
pub async fn parse_epub<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
) -> Result<ParsedBook, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let epub_path = book_dir.join("book.epub");
    let reader = EpubReader::new().map_err(|e| e.to_string())?;
    let content = reader.read_epub(&epub_path).map_err(|e| e.to_string())?;
    Ok(ParsedBook {
        title: content.title,
        author: content.author,
        chapters: content.chapters.len(),
    })
}

/// Index an EPUB: resolve book_dir from $AppData/books/{book_id},
/// parse, write chapters txt, vectorize and persist locally.
#[tauri::command]
pub async fn index_epub<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    _dimension: Option<usize>,
    embeddings_url: String,
    model: String,
    api_key: Option<String>,
) -> Result<IndexResult, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);

    #[derive(Serialize, Clone)]
    struct IndexProgressEvent {
        book_id: String,
        current: usize,
        total: usize,
        percent: f32,
        md_file_path: String,
        chunk_index: usize,
        related_chapter_titles: String,
    }

    let app_for_emit = app.clone();
    let book_id_for_emit = book_id.clone();

    let report = process_epub_to_db(
        &book_dir,
        ProcessOptions {
            batch_size: None,
            vectorizer: VectorizerConfig {
                embeddings_url,
                model_name: model,
                api_key,
            },
        },
        Some(move |u: ProgressUpdate| {
            let payload = IndexProgressEvent {
                book_id: book_id_for_emit.clone(),
                current: u.current,
                total: u.total,
                percent: u.percent,
                md_file_path: u.md_file_path,
                chunk_index: u.chunk_index,
                related_chapter_titles: u.related_chapter_titles,
            };
            let _ = app_for_emit.emit("epub://index-progress", payload);
        }),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(IndexResult {
        success: true,
        message: "indexed".into(),
        report: Some(report.into()),
    })
}

/// Convert an EPUB under $AppData/books/{book_id} to mdBook structure at {book_dir}/mdbook
#[tauri::command]
pub async fn convert_to_mdbook<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    overwrite: Option<bool>,
) -> Result<MdbookResult, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let epub_path = book_dir.join("book.epub");
    let mdbook_dir = book_dir.join("mdbook");

    if !epub_path.exists() {
        return Err(format!("EPUB not found: {}", epub_path.to_string_lossy()));
    }
    if !mdbook_dir.exists() {
        std::fs::create_dir_all(&mdbook_dir).map_err(|e| e.to_string())?;
    }

    let ow = overwrite.unwrap_or(true);
    log::info!(
        "convert_to_mdbook: book_id={}, epub_path={:?}, output_dir={:?}, overwrite={}",
        book_id,
        epub_path,
        mdbook_dir,
        ow
    );
    match convert_epub_to_mdbook(&epub_path, &mdbook_dir, ow) {
        Ok(_) => {
            log::info!("convert_to_mdbook: success at {:?}", mdbook_dir);
            Ok(MdbookResult {
                success: true,
                message: "converted".into(),
                output_dir: Some(mdbook_dir.to_string_lossy().to_string()),
            })
        }
        Err(e) => {
            log::error!("convert_to_mdbook: failed: {}", e);
            Err(format!("convert epub->mdbook failed: {}", e))
        }
    }
}

/// Parse the TOC structure of an EPUB book, returning a flattened array
#[tauri::command]
pub async fn parse_toc<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
) -> Result<Vec<FlatTocNode>, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let mdbook_dir = book_dir.join("mdbook");

    // 在 mdbook 目录下递归搜索 toc.ncx
    let toc_path = find_toc_ncx_in_mdbook(&mdbook_dir)
        .ok_or_else(|| "TOC file (toc.ncx) not found in MDBook directory".to_string())?;

    let toc_nodes = parse_toc_file(&toc_path)?;
    let flat_toc = flatten_toc(&toc_nodes);
    Ok(flat_toc)
}

#[derive(Serialize)]
pub struct SearchItemDto {
    pub book_title: String,
    pub book_author: String,
    pub content: String,
    pub similarity: f32,

    // 文件级别信息
    pub md_file_path: String,
    pub file_order_in_book: u32,

    // 章节关联信息
    pub related_chapter_titles: String,

    // 分片位置信息
    pub chunk_id: i64,
    pub chunk_order_in_file: usize,
    pub total_chunks_in_file: usize,
    pub global_chunk_index: usize,
}

/// Search the vector database for similar chunks with hybrid search support.
#[tauri::command]
pub async fn search_db<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    query: String,
    limit: Option<usize>,
    dimension: Option<usize>,
    embeddings_url: String,
    model: String,
    api_key: Option<String>,
    // 新增混合搜索参数
    search_mode: Option<String>,      // "vector", "bm25", "hybrid"
    vector_weight: Option<f32>,       // 向量权重 (0.0-1.0)
    bm25_weight: Option<f32>,         // BM25权重 (0.0-1.0)
) -> Result<Vec<SearchItemDto>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(book_id);

    // 解析搜索模式
    let mode = search_mode.as_deref().unwrap_or("hybrid");

    let results = crate::pipeline::search_db_with_mode(
        &book_dir,
        &query,
        limit.unwrap_or(5),
        dimension.unwrap_or(1024),
        VectorizerConfig {
            embeddings_url,
            model_name: model,
            api_key,
        },
        mode,
        vector_weight,
        bm25_weight,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(results
        .into_iter()
        .map(|r| SearchItemDto {
            book_title: r.book_title,
            book_author: r.book_author,
            content: r.chunk_text,
            similarity: r.similarity_score,
            md_file_path: r.md_file_path,
            file_order_in_book: r.file_order_in_book,
            related_chapter_titles: r.related_chapter_titles,
            chunk_id: r.chunk_id,
            chunk_order_in_file: r.chunk_order_in_file,
            total_chunks_in_file: r.total_chunks_in_file,
            global_chunk_index: r.global_chunk_index,
        })
        .collect())
}

/// Get chunk with context by chunk ID
#[tauri::command]
pub fn get_chunk_with_context<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    chunk_id: i64,
    prev_count: usize,
    next_count: usize,
) -> Result<Vec<DocumentChunkDto>, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let db_path = book_dir.join("vectors.sqlite");
    
    let db = VectorDatabase::new(&db_path, 1024).map_err(|e| e.to_string())?;
    let chunks = db.get_chunk_with_context(chunk_id, prev_count, next_count)
        .map_err(|e| e.to_string())?;
    
    Ok(chunks.into_iter().map(DocumentChunkDto::from).collect())
}

/// Get all chunks for a chapter by title
#[tauri::command]
pub fn get_toc_chunks<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    chapter_title: String,
) -> Result<Vec<DocumentChunkDto>, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let db_path = book_dir.join("vectors.sqlite");

    let db = VectorDatabase::new(&db_path, 1024).map_err(|e| e.to_string())?;
    let chunks = db.get_chunks_by_chapter_title(&chapter_title).map_err(|e| e.to_string())?;

    Ok(chunks.into_iter().map(DocumentChunkDto::from).collect())
}

/// Get chunks by global index range
#[tauri::command]
pub fn get_chunks_by_range<R: Runtime>(
    app: AppHandle<R>,
    _state: State<'_, EpubState>,
    book_id: String,
    start_index: usize,
    end_index: usize,
) -> Result<Vec<DocumentChunkDto>, String> {
    if book_id.trim().is_empty() {
        return Err("book_id is empty".into());
    }
    
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let book_dir = app_data_dir.join("books").join(&book_id);
    let db_path = book_dir.join("vectors.sqlite");
    
    let db = VectorDatabase::new(&db_path, 1024).map_err(|e| e.to_string())?;
    let chunks = db.get_chunks_by_global_index_range(start_index, end_index)
        .map_err(|e| e.to_string())?;
    
    Ok(chunks.into_iter().map(DocumentChunkDto::from).collect())
}

#[derive(Serialize)]
pub struct DocumentChunkDto {
    pub id: Option<i64>,
    pub book_title: String,
    pub book_author: String,
    pub md_file_path: String,
    pub file_order_in_book: u32,
    pub related_chapter_titles: String,
    pub chunk_text: String,
    pub chunk_order_in_file: usize,
    pub total_chunks_in_file: usize,
    pub global_chunk_index: usize,
}

impl From<DocumentChunk> for DocumentChunkDto {
    fn from(chunk: DocumentChunk) -> Self {
        Self {
            id: chunk.id,
            book_title: chunk.book_title,
            book_author: chunk.book_author,
            md_file_path: chunk.md_file_path,
            file_order_in_book: chunk.file_order_in_book,
            related_chapter_titles: chunk.related_chapter_titles,
            chunk_text: chunk.chunk_text,
            chunk_order_in_file: chunk.chunk_order_in_file,
            total_chunks_in_file: chunk.total_chunks_in_file,
            global_chunk_index: chunk.global_chunk_index,
        }
    }
}
