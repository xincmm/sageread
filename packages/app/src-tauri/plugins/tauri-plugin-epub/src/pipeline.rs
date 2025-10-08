use anyhow::{Context, Result};
use std::fs;
use std::path::Path;

use crate::database::VectorDatabase;
use crate::epub::EpubReader;
use crate::text::TextVectorizer;
use crate::epub::{parse_toc_file, find_toc_ncx_in_mdbook, flatten_toc};
use crate::models::{
    DocumentChunk, EpubContent, ProcessOptions, ProcessReport, ProgressUpdate,
    ErrorStats, VectorizerConfig, BookMetadataFile, AuthorField, FlatTocNode
};
use epub2mdbook::convert_epub_to_mdbook;

/// Core pipeline: book_dir -> locate book.epub -> parse -> write chapters -> vectorize -> persist to SQLite
pub async fn process_epub_to_db<P: AsRef<Path>, F>(
    book_dir: P,
    opts: ProcessOptions,
    mut on_progress: Option<F>,
) -> Result<ProcessReport>
where
    F: FnMut(ProgressUpdate) + Send,
{
    let book_dir = book_dir.as_ref();
    let epub_path = book_dir.join("book.epub");
    let db_path = book_dir.join("vectors.sqlite");

    if !epub_path.exists() {
        log::error!("EPUB file not found at path: {:?}", epub_path);
        log::error!("Book directory contents: {:?}", 
            std::fs::read_dir(book_dir)
                .map(|entries| entries.collect::<Result<Vec<_>, _>>())
                .unwrap_or_else(|e| Err(e))
        );
        anyhow::bail!("EPUB not found: {:?}", epub_path);
    }

    log::info!("Starting EPUB processing pipeline for book directory: {:?}", book_dir);
    log::info!("Reading EPUB: {:?}", epub_path);
    let reader = EpubReader::new()
        .with_context(|| "Failed to initialize EPUB reader")?;
    let epub_content = reader.read_epub(&epub_path)
        .with_context(|| format!("Failed to read EPUB file: {:?}", epub_path))?;

    log::info!(
        "Loaded book: {} (author: {}), chapters: {}",
        epub_content.title,
        epub_content.author,
        epub_content.chapters.len()
    );

    // Step 1: Convert EPUB to MDBook format
    let mdbook_dir = book_dir.join("mdbook");
    log::info!("Converting EPUB to MDBook format at: {:?}", mdbook_dir);

    if !mdbook_dir.exists() {
        fs::create_dir_all(&mdbook_dir).context("Failed to create mdbook directory")?;
    }

    // Check if conversion is needed (compare file timestamps)
    // let need_conversion = if mdbook_dir.join("book").join("src").exists() {
    //     let epub_time = epub_path.metadata()
    //         .map(|m| m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))
    //         .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

    //     let mdbook_time = mdbook_dir.metadata()
    //         .map(|m| m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))
    //         .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

    //     epub_time > mdbook_time
    // } else {
    //     true
    // };
    let need_conversion = true;

    if need_conversion {
        log::info!("Converting EPUB to MDBook (EPUB is newer or MDBook doesn't exist)");
        convert_epub_to_mdbook(&epub_path, &mdbook_dir, true)
            .map_err(|e| anyhow::anyhow!("Failed to convert EPUB to MDBook: {}", e))?;
        log::info!("EPUB to MDBook conversion completed");
    } else {
        log::info!("MDBook is up-to-date, skipping conversion");
    }

    // Step 2: Parse and flatten TOC
    log::info!("Parsing TOC structure...");
    let toc_path = find_toc_ncx_in_mdbook(&mdbook_dir)
        .context("TOC file (toc.ncx) not found in MDBook directory")?;

    log::info!("Found TOC file at: {:?}", toc_path);
    let toc_nodes = parse_toc_file(&toc_path)
        .map_err(|e| anyhow::anyhow!("Failed to parse TOC file: {}", e))?;

    let flat_toc = flatten_toc(&toc_nodes);
    log::info!("TOC parsing completed: {} entries found", flat_toc.len());

    // Write chapters to text files under book_dir/chapters (keep for backward compatibility)
    let chapters_dir = book_dir.join("chapters");
    if !chapters_dir.exists() {
        fs::create_dir_all(&chapters_dir).context("Failed to create chapters directory")?;
    }

    for chapter in &epub_content.chapters {
        let safe_title = sanitize_filename(&chapter.title);
        let filename = format!("{:03}-{}.txt", chapter.order + 1, safe_title);
        let path = chapters_dir.join(filename);
        fs::write(&path, &chapter.content).with_context(|| format!("Failed to write chapter: {:?}", path))?;
    }
    log::info!(
        "章节落盘完成：写入目录 {:?}，章节数 {}",
        chapters_dir,
        epub_content.chapters.len()
    );

    // Step 3: Process MD files with pipeline processing (no all_chunks accumulation)
    let _mdbook_src_dir = mdbook_dir.join("book").join("src");
    log::info!("Processing MD files for chunking (dedup by md_src)...");

    // 获取toc.ncx文件所在的目录，MD文件路径都是相对于它的
    let toc_base_dir = toc_path.parent()
        .ok_or_else(|| anyhow::anyhow!("Cannot get parent directory of TOC file"))?;

    // Step 2.5: Write metadata.md combining metadata.json and TOC summary
    if let Err(e) = write_metadata_markdown(book_dir, &epub_content, &flat_toc, toc_base_dir) {
        log::warn!("生成 metadata.md 失败：{}", e);
    } else {
        log::info!("已生成 metadata.md（用于模型提示）");
    }

    // 构建 md_src -> 该文件相关的 TOC 节点列表（包含其在全局扁平 TOC 中的索引）
    let mut md_groups: std::collections::BTreeMap<String, Vec<(usize, FlatTocNode)>> = std::collections::BTreeMap::new();
    for (idx, n) in flat_toc.iter().cloned().enumerate() {
        md_groups.entry(n.md_src.clone()).or_default().push((idx, n));
    }

    // 预先计算总文件数用于进度报告
    let total_files = md_groups.len();
    log::info!("准备处理 {} 个MD文件", total_files);

    // 统一使用真实/本地 API 向量化器 (提前初始化，复用连接)
    log::info!("Initializing text vectorizer with config: embeddings_url={}, model_name={}, api_key={}",
        opts.vectorizer.embeddings_url,
        opts.vectorizer.model_name,
        if opts.vectorizer.api_key.is_some() { "***" } else { "None" }
    );
    let mut vectorizer = TextVectorizer::new(opts.vectorizer.clone())
        .await
        .with_context(|| format!("Failed to initialize text vectorizer with embeddings_url: {}, model: {}",
            opts.vectorizer.embeddings_url, opts.vectorizer.model_name))?;
    log::info!("Text vectorizer initialized successfully");

    // 检测实际的向量维度
    log::info!("检测向量维度...");
    let actual_dimension = vectorizer.detect_embedding_dimension()
        .await
        .with_context(|| "Failed to detect embedding dimension")?;
    log::info!("检测到实际向量维度: {}", actual_dimension);

    // 直接删除数据库文件，不管是否存在
    log::info!("删除现有数据库文件（如果存在）");
    if db_path.exists() {
        std::fs::remove_file(&db_path)
            .with_context(|| format!("Failed to remove database file: {:?}", db_path))?;
        log::info!("数据库文件已删除: {:?}", db_path);
    } else {
        log::info!("数据库文件不存在，将创建新文件");
    }

    // 使用检测到的维度创建数据库
    log::info!("Opening vector database at: {:?} with dimension: {}", db_path, actual_dimension);
    let mut db = VectorDatabase::new(&db_path, actual_dimension)
        .with_context(|| format!("Failed to open/create database at {:?} with dimension {}", db_path, actual_dimension))?;
    log::info!("Vector database opened successfully");
    if let Err(e) = db.initialize_vec_table() {
        log::warn!(
            "sqlite-vec unavailable, fallback to standard storage: {}",
            e
        );
    }
    let batch_size = opts.batch_size.unwrap_or(10);

    // 流水线处理：逐个文件处理，立即向量化和入库
    let mut global_chunk_index = 0;
    let mut total_processed_chunks = 0;

    // 错误统计
    let mut error_stats = ErrorStats::new();

    log::info!("开始流水线处理：逐文件分片→向量化→入库");

    // 流水线处理每个唯一 md_src 文件
    for (file_index, (md_src, nodes)) in md_groups.iter().enumerate() {
        let md_file_path = toc_base_dir.join(&md_src);
        if !md_file_path.exists() {
            log::warn!("MD file not found: {:?} (relative to TOC: {}), skipping", md_file_path, md_src);
            continue;
        }

        log::info!(
            "处理文件 {}/{}: {} ",
            file_index + 1,
            total_files,
            md_src
        );

        let md_content = match fs::read_to_string(&md_file_path) {
            Ok(content) => content,
            Err(e) => {
                let error_msg = format!("Failed to read MD file {:?}: {}", md_file_path, e);
                log::error!("{}", error_msg);
                error_stats.add_file_error(md_src, &e.to_string());
                continue; // 跳过这个文件，继续处理其他文件
            }
        };

        if md_content.trim().is_empty() {
            log::debug!("跳过空文件: {}", md_src);
            continue;
        }

        // 使用 Markdown 感知分片（更稳定的结构边界）
        let chunks = reader.chunk_md_file(&md_content, 50, 400);
        let total_chunks_in_file = chunks.len();
        if total_chunks_in_file == 0 {
            log::debug!("文件无有效分片: {}", md_src);
            continue;
        }

        // 收集该文件相关的所有 TOC 节点信息
        let mut related_toc_nodes = Vec::new();
        let mut min_play_order = u32::MAX;

        for (_toc_index, node) in nodes {
            related_toc_nodes.push(node.clone());
            min_play_order = min_play_order.min(node.play_order);
        }

        // 生成章节标题字符串：连接所有相关章节的标题
        let related_chapter_titles = if !related_toc_nodes.is_empty() {
            // 收集所有相关节点的标题，按play_order排序
            let mut sorted_nodes = related_toc_nodes.clone();
            sorted_nodes.sort_by_key(|node| node.play_order);
            
            // 连接所有章节标题
            sorted_nodes
                .iter()
                .map(|node| node.title.clone())
                .collect::<Vec<String>>()
                .join("|")
        } else {
            // 兜底：如果没有节点，使用空字符串
            String::new()
        };

        log::info!(
            "文件 {} 分片完成：{} 个分片，开始向量化...",
            md_src,
            total_chunks_in_file
        );

        // 立即处理该文件的所有分片：分片→向量化→批量入库
        let mut file_batch: Option<Vec<DocumentChunk>> = None;
        // 以“等长估计”给每个 chunk 一个起始位置，用于分配区间
        for (chunk_index, chunk_content) in chunks.into_iter().enumerate() {
            if chunk_content.trim().is_empty() { continue; }

            // 立即向量化和处理这个分片
            log::debug!(
                "向量化分片 {}/{} (文件: {})",
                chunk_index + 1,
                total_chunks_in_file,
                md_src
            );

            let embedding = match vectorizer.vectorize_text(&chunk_content).await {
                Ok(emb) => emb,
                Err(e) => {
                    log::error!("向量化失败 (文件: {}, 分片: {}): {}", md_src, chunk_index, e);
                    error_stats.add_chunk_error();
                    continue; // 跳过这个分片，继续处理其他分片
                }
            };

            // 创建DocumentChunk并添加到批次中
            // 存储绝对路径而不是相对路径，以便正确解析图片路径
            let absolute_md_path = md_file_path.to_string_lossy().to_string();
            let chunk = DocumentChunk {
                id: None,
                book_title: epub_content.title.clone(),
                book_author: epub_content.author.clone(),
                md_file_path: absolute_md_path,
                file_order_in_book: min_play_order,
                related_chapter_titles: related_chapter_titles.clone(),
                chunk_text: chunk_content,
                chunk_order_in_file: chunk_index,
                total_chunks_in_file: total_chunks_in_file,
                embedding,
                global_chunk_index,
            };

            // 添加到当前文件的批次中
            if file_batch.is_none() {
                file_batch = Some(Vec::new());
            }
            file_batch.as_mut().unwrap().push(chunk);
            global_chunk_index += 1;

            // 如果批次达到大小，立即入库
            if file_batch.as_ref().unwrap().len() >= batch_size {
                if let Err(e) = db.insert_chunks_batch(file_batch.as_ref().unwrap()) {
                    log::error!("批量入库失败 (文件: {}): {}", md_src, e);
                    error_stats.add_db_error();
                } else {
                    log::debug!("批量入库成功：{} 个分片", file_batch.as_ref().unwrap().len());
                }
                total_processed_chunks += file_batch.as_ref().unwrap().len();
                file_batch = Some(Vec::new());
            }

            // 发送进度更新
            if let Some(cb) = on_progress.as_mut() {
                let file_progress = ((chunk_index + 1) as f32 / total_chunks_in_file as f32) * 100.0;
                let overall_progress = ((file_index as f32 + file_progress / 100.0) / total_files as f32) * 100.0;

                // 估算总分片数：已处理的分片数 + 当前文件剩余分片数 + 剩余文件的估算分片数
                let remaining_chunks_in_current_file = total_chunks_in_file - (chunk_index + 1);
                let remaining_files = total_files - (file_index + 1);
                let estimated_chunks_per_file = if file_index > 0 {
                    (total_processed_chunks + chunk_index + 1) / (file_index + 1)
                } else {
                    total_chunks_in_file
                };
                let estimated_total = total_processed_chunks + chunk_index + 1 + remaining_chunks_in_current_file + (remaining_files * estimated_chunks_per_file);

                cb(ProgressUpdate {
                    current: total_processed_chunks + chunk_index + 1,
                    total: estimated_total,
                    percent: overall_progress,
                    md_file_path: md_src.to_string(),
                    chunk_index,
                    related_chapter_titles: related_chapter_titles.clone(),
                });
            }
        }

        // 处理该文件剩余的分片
        if let Some(batch) = file_batch {
            if !batch.is_empty() {
                if let Err(e) = db.insert_chunks_batch(&batch) {
                    log::error!("最终批量入库失败 (文件: {}): {}", md_src, e);
                    error_stats.add_db_error();
                } else {
                    log::debug!("最终批量入库成功：{} 个分片", batch.len());
                }
                total_processed_chunks += batch.len();
            }
        }

        log::info!(
            "文件 {} 处理完成：{} 个分片已入库",
            md_src,
            total_chunks_in_file
        );
    }

    // 报告错误统计
    if error_stats.failed_files > 0 || error_stats.failed_chunks > 0 || error_stats.failed_db_operations > 0 {
        log::warn!(
            "处理过程中遇到错误：{} 个文件失败，{} 个分片失败，{} 个数据库操作失败",
            error_stats.failed_files,
            error_stats.failed_chunks,
            error_stats.failed_db_operations
        );

        if !error_stats.file_errors.is_empty() {
            log::warn!("文件错误详情：");
            for error in &error_stats.file_errors {
                log::warn!("  - {}", error);
            }
        }
    }

    log::info!("流水线处理完成：共计 {} 个分片已处理", total_processed_chunks);

    Ok(ProcessReport {
        db_path,
        book_title: epub_content.title,
        book_author: epub_content.author,
        total_chunks: total_processed_chunks,
        vector_dimension: actual_dimension,
    })
}

// 移除了未使用的search_db函数

/// 支持混合搜索模式的数据库搜索
pub async fn search_db_with_mode<P: AsRef<Path>>(
    book_dir: P,
    query: &str,
    limit: usize,
    _dimension: usize, // 保留参数以保持API兼容性
    vectorizer: VectorizerConfig,
    search_mode: &str,
    vector_weight: Option<f32>,
    bm25_weight: Option<f32>,
) -> Result<Vec<crate::models::SearchResult>> {
    let db_path = book_dir.as_ref().join("vectors.sqlite");

    // 检查数据库文件是否存在
    if !db_path.exists() {
        return Err(anyhow::anyhow!("数据库文件不存在: {:?}，请先对书籍进行向量化处理", db_path));
    }

    // 解析搜索模式
    let mode = search_mode.parse::<crate::models::SearchMode>()
        .unwrap_or(crate::models::SearchMode::Hybrid);

    // 创建搜索配置（使用简化的配置管理器）
    let config = if vector_weight.is_some() || bm25_weight.is_some() {
        // 使用自定义权重
        crate::config::create_custom_hybrid_config(Some(mode.clone()), vector_weight, bm25_weight)
    } else {
        // 使用智能推荐配置
        crate::config::get_smart_hybrid_config(query)
    };

    // 根据搜索模式执行相应的搜索
    match mode {
        crate::models::SearchMode::BM25Only => {
            // 对于BM25Only模式，不需要向量化
            log::info!("执行BM25搜索: {}", db_path.display());

            // 使用默认维度打开数据库（BM25不需要向量）
            let db = VectorDatabase::open_for_search(&db_path, 1024)
                .context("Open database failed")?;

            db.search_with_mode(query, None, limit, &config)
        }
        _ => {
            // 需要向量化的模式
            let mut v = TextVectorizer::new(vectorizer).await?;
            let actual_dimension = v.detect_embedding_dimension().await
                .context("Failed to detect embedding dimension")?;

            log::info!("检测到向量维度: {}", actual_dimension);

            // 打开数据库
            let db = VectorDatabase::open_for_search(&db_path, actual_dimension)
                .context("Open database failed")?;

            let embedding = v.vectorize_text(query).await?;

            // 使用新的搜索接口
            db.search_with_mode(query, Some(&embedding), limit, &config)
        }
    }
}

fn sanitize_filename(name: &str) -> String {
    // Replace reserved characters but preserve Unicode; then safely limit length.
    let mut s: String = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect();

    // Truncate by char boundary to avoid slicing inside a multi-byte codepoint.
    const MAX_LEN: usize = 80;
    if s.len() > MAX_LEN {
        // Fast path: try to truncate at MAX_LEN or backtrack to nearest char boundary
        let mut end = MAX_LEN;
        while end > 0 && !s.is_char_boundary(end) {
            end -= 1;
        }
        s.truncate(end);
    }

    if s.trim().is_empty() { "chapter".to_string() } else { s }
}

fn write_metadata_markdown(book_dir: &Path, epub_content: &EpubContent, flat_toc: &[FlatTocNode], toc_base_dir: &Path) -> Result<()> {
    // Try read metadata.json from book_dir
    let metadata_path = book_dir.join("metadata.json");
    let meta_file: Option<BookMetadataFile> = match fs::read_to_string(&metadata_path) {
        Ok(s) => match serde_json::from_str::<BookMetadataFile>(&s) {
            Ok(m) => Some(m),
            Err(e) => {
                log::warn!("metadata.json 解析失败：{} — 将使用 EPUB 信息兜底", e);
                None
            }
        },
        Err(_) => None,
    };

    // Merge fields with EPUB fallback
    let title = meta_file
        .as_ref()
        .and_then(|m| m.title.as_ref())
        .cloned()
        .unwrap_or_else(|| epub_content.title.clone());
    let author = meta_file
        .as_ref()
        .and_then(|m| m.author.as_ref())
        .map(|a| match a {
            AuthorField::Person(p) => p.name.clone().unwrap_or_default(),
            AuthorField::List(list) => {
                let names: Vec<String> = list.iter().filter_map(|p| p.name.clone()).collect();
                if names.is_empty() { String::new() } else { names.join("、") }
            }
            AuthorField::String(s) => s.clone(),
        })
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| epub_content.author.clone());
    let language = meta_file.as_ref().and_then(|m| m.language.clone()).unwrap_or_else(|| "".to_string());
    let published = meta_file.as_ref().and_then(|m| m.published.clone()).unwrap_or_else(|| "".to_string());
    let publisher = meta_file.as_ref().and_then(|m| m.publisher.clone()).unwrap_or_else(|| "".to_string());

    let mut md = String::new();
    md.push_str(&format!("# {}\n\n", title));
    md.push_str("书籍元信息\n\n");
    md.push_str(&format!("- 标题: {}\n", title));
    md.push_str(&format!("- 作者: {}\n", author));
    if !publisher.is_empty() {
        md.push_str(&format!("- 出版社: {}\n", publisher));
    }
    if !published.is_empty() {
        md.push_str(&format!("- 出版日期: {}\n", published));
    }
    if !language.is_empty() {
        md.push_str(&format!("- 语言: {}\n", language));
    }
    md.push_str("\n");

    md.push_str("## 目录\n\n");
    md.push_str("说明：每项显示章节标题（用于 ragToc 工具的 chapter_title 参数）。\n\n");
    for node in flat_toc {
        // indent two spaces per depth
        let indent = "  ".repeat(node.depth as usize);
        // Use chapter title for ragToc tool instead of toc_id
        md.push_str(&format!("{}- {}\n", indent, node.title));
    }

    let out_path = book_dir.join("metadata.md");
    fs::write(&out_path, md).with_context(|| format!("写入 metadata.md 失败: {:?}", out_path))?;

    // Update metadata.json with base_dir
    let updated_metadata = BookMetadataFile {
        title: Some(title),
        language: if language.is_empty() { None } else { Some(language) },
        published: if published.is_empty() { None } else { Some(published) },
        publisher: if publisher.is_empty() { None } else { Some(publisher) },
        author: meta_file.as_ref().and_then(|m| m.author.clone()).or_else(|| {
            if epub_content.author.is_empty() { None } else { Some(AuthorField::String(epub_content.author.clone())) }
        }),
        base_dir: Some(toc_base_dir.to_string_lossy().to_string()),
    };

    let metadata_json = serde_json::to_string_pretty(&updated_metadata)
        .context("Failed to serialize metadata")?;
    fs::write(&metadata_path, metadata_json)
        .with_context(|| format!("写入 metadata.json 失败: {:?}", metadata_path))?;

    log::info!("已更新 metadata.json，添加了 base_dir: {:?}", toc_base_dir);

    Ok(())
}