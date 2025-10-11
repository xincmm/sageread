use super::models::*;
use sqlx::{Row, SqlitePool};
use std::fs;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn save_book(app_handle: AppHandle, data: BookUploadData) -> Result<SimpleBook, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let existing_book = get_book_by_id(app_handle.clone(), data.id.clone()).await?;
    if let Some(book) = existing_book {
        return Err(format!("书籍已存在: {} (ID: {})", book.title, book.id));
    }

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用目录失败: {}", e))?;

    let books_dir = app_data_dir.join("books");
    let book_dir = books_dir.join(&data.id);
    fs::create_dir_all(&book_dir).map_err(|e| format!("创建目录失败: {}", e))?;

    let epub_filename = format!("book.{}", data.format.to_lowercase());
    let epub_path = book_dir.join(&epub_filename);

    if !data.temp_file_path.is_empty() {
        match std::fs::rename(&data.temp_file_path, &epub_path) {
            Ok(_) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                log::warn!(
                    "rename failed (missing source): {:?} -> {:?}, fallback to copy",
                    data.temp_file_path,
                    epub_path
                );
                if let Some(parent) = epub_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("创建书籍目录失败: {}", e))?;
                }
                std::fs::copy(&data.temp_file_path, &epub_path)
                    .map_err(|e| format!("复制书籍文件失败: {}", e))?;
            }
            Err(err) => {
                return Err(format!("移动书籍文件失败: {}", err));
            }
        }
    }

    let cover_path = if let Some(cover_temp_path) = &data.cover_temp_file_path {
        let cover_file = book_dir.join("cover.jpg");
        match std::fs::rename(cover_temp_path, &cover_file) {
            Ok(_) => {}
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                log::warn!(
                    "rename cover failed (missing source): {:?} -> {:?}, fallback to copy",
                    cover_temp_path,
                    cover_file
                );
                std::fs::copy(cover_temp_path, &cover_file)
                    .map_err(|e| format!("复制封面文件失败: {}", e))?;
            }
            Err(err) => {
                return Err(format!("移动封面文件失败: {}", err));
            }
        }
        Some(format!("books/{}/cover.jpg", data.id))
    } else {
        None
    };

    if let Some(derived_files) = &data.derived_files {
        for derived in derived_files {
            let target_path = book_dir.join(&derived.filename);
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("创建衍生文件目录失败: {}", e))?;
            }

            match std::fs::rename(&derived.temp_file_path, &target_path) {
                Ok(_) => {}
                Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                    log::warn!(
                        "rename derived failed (missing source): {:?} -> {:?}, fallback to copy",
                        derived.temp_file_path,
                        target_path
                    );
                    std::fs::copy(&derived.temp_file_path, &target_path)
                        .map_err(|e| format!("复制衍生文件失败: {}", e))?;
                }
                Err(err) => {
                    return Err(format!("移动衍生文件失败: {}", err));
                }
            }
        }
    }

    let metadata_path = book_dir.join("metadata.json");
    let metadata_json = serde_json::to_string_pretty(&data.metadata)
        .map_err(|e| format!("序列化元数据失败: {}", e))?;
    fs::write(&metadata_path, metadata_json).map_err(|e| format!("保存元数据失败: {}", e))?;

    let file_path = format!("books/{}/{}", data.id, epub_filename);
    let now = chrono::Utc::now().timestamp_millis();

    let mut tx = db_pool
        .begin()
        .await
        .map_err(|e| format!("开启事务失败: {}", e))?;

    sqlx::query(
        r#"
        INSERT INTO books (
            id, title, author, format, file_path, cover_path,
            file_size, language, tags,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&data.id)
    .bind(&data.title)
    .bind(&data.author)
    .bind(&data.format)
    .bind(&file_path)
    .bind(&cover_path)
    .bind(data.file_size)
    .bind(&data.language)
    .bind(None::<String>) // tags
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("数据库插入失败: {}", e))?;

    sqlx::query(
        r#"
        INSERT INTO book_status (
            book_id, status, progress_current, progress_total, location,
            metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&data.id)
    .bind("unread")
    .bind(0i64)
    .bind(0i64)
    .bind("")
    .bind(None::<String>)
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("创建书籍状态失败: {}", e))?;

    tx.commit()
        .await
        .map_err(|e| format!("提交事务失败: {}", e))?;

    Ok(SimpleBook::new(
        data.id,
        data.title,
        data.author,
        data.format,
        file_path,
        cover_path,
        data.file_size,
        data.language,
    ))
}

#[tauri::command]
pub async fn get_books(
    app_handle: AppHandle,
    options: Option<BookQueryOptions>,
) -> Result<Vec<SimpleBook>, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let opts = options.unwrap_or_default();

    let mut query = String::from("SELECT * FROM books");
    let mut conditions = Vec::new();

    if let Some(search_query) = &opts.search_query {
        if !search_query.trim().is_empty() {
            conditions.push(format!(
                "(title LIKE '%{}%' OR author LIKE '%{}%')",
                search_query.replace('\'', "''"),
                search_query.replace('\'', "''")
            ));
        }
    }

    if let Some(tags) = &opts.tags {
        if !tags.is_empty() {
            let tag_conditions: Vec<String> = tags
                .iter()
                .map(|tag| format!("tags LIKE '%\"{}\"%%'", tag.replace('\'', "''")))
                .collect();
            conditions.push(format!("({})", tag_conditions.join(" OR ")));
        }
    }

    if !conditions.is_empty() {
        query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
    }

    let sort_by = opts.sort_by.as_deref().unwrap_or("updated_at");
    let sort_order = opts.sort_order.as_deref().unwrap_or("desc");
    query.push_str(&format!(
        " ORDER BY {} {}",
        sort_by,
        sort_order.to_uppercase()
    ));

    if let Some(limit) = opts.limit {
        query.push_str(&format!(" LIMIT {}", limit));
        if let Some(offset) = opts.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }
    }

    let rows = sqlx::query(&query)
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("查询书籍失败: {}", e))?;

    let books: Result<Vec<SimpleBook>, sqlx::Error> =
        rows.iter().map(SimpleBook::from_db_row).collect();

    books.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn get_book_by_id(
    app_handle: AppHandle,
    id: String,
) -> Result<Option<SimpleBook>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM books WHERE id = ?")
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询书籍失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            SimpleBook::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_book(
    app_handle: AppHandle,
    id: String,
    update_data: BookUpdateData,
) -> Result<SimpleBook, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = update_data
        .updated_at
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

    if let Some(title) = &update_data.title {
        sqlx::query("UPDATE books SET title = ?, updated_at = ? WHERE id = ?")
            .bind(title)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新标题失败: {}", e))?;
    }

    if let Some(author) = &update_data.author {
        sqlx::query("UPDATE books SET author = ?, updated_at = ? WHERE id = ?")
            .bind(author)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新作者失败: {}", e))?;
    }

    if let Some(tags) = &update_data.tags {
        let tags_json =
            serde_json::to_string(tags).map_err(|e| format!("序列化标签失败: {}", e))?;
        sqlx::query("UPDATE books SET tags = ?, updated_at = ? WHERE id = ?")
            .bind(tags_json)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新标签失败: {}", e))?;
    }

    if update_data.title.is_none() && update_data.author.is_none() && update_data.tags.is_none() {
        sqlx::query("UPDATE books SET updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新时间戳失败: {}", e))?;
    }

    get_book_by_id(app_handle, id)
        .await?
        .ok_or_else(|| "更新后无法找到书籍".to_string())
}

#[tauri::command]
pub async fn delete_book(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用目录失败: {}", e))?;

    let book_dir = app_data_dir.join("books").join(&id);
    if book_dir.exists() {
        std::fs::remove_dir_all(&book_dir).map_err(|e| format!("删除书籍文件失败: {}", e))?;
    }

    // 外键约束会自动删除相关的 book_status, reading_sessions 和 threads
    let result = sqlx::query("DELETE FROM books WHERE id = ?")
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除书籍失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("书籍不存在".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_book_status(
    app_handle: AppHandle,
    book_id: String,
) -> Result<Option<BookStatus>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let result = sqlx::query("SELECT * FROM book_status WHERE book_id = ?")
        .bind(&book_id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询书籍状态失败: {}", e))?;

    match result {
        Some(row) => Ok(Some(
            BookStatus::from_db_row(&row).map_err(|e| format!("解析数据失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_book_status(
    app_handle: AppHandle,
    book_id: String,
    update_data: BookStatusUpdateData,
) -> Result<BookStatus, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    let current_status = get_book_status(app_handle.clone(), book_id.clone())
        .await?
        .ok_or_else(|| "书籍状态不存在".to_string())?;

    let new_status = update_data.status.unwrap_or(current_status.status);
    let new_progress_current = update_data
        .progress_current
        .unwrap_or(current_status.progress_current);
    let new_progress_total = update_data
        .progress_total
        .unwrap_or(current_status.progress_total);
    let new_location = update_data.location.unwrap_or(current_status.location);
    let new_last_read_at = update_data.last_read_at.or(current_status.last_read_at);
    let new_started_at = update_data.started_at.or(current_status.started_at);
    let new_completed_at = update_data.completed_at.or(current_status.completed_at);
    let new_metadata = update_data.metadata.or(current_status.metadata);

    let result = sqlx::query(
        r#"
        UPDATE book_status SET
            status = ?, progress_current = ?, progress_total = ?, location = ?,
            last_read_at = ?, started_at = ?, completed_at = ?, metadata = ?, updated_at = ?
        WHERE book_id = ?
        "#,
    )
    .bind(&new_status)
    .bind(new_progress_current)
    .bind(new_progress_total)
    .bind(&new_location)
    .bind(new_last_read_at)
    .bind(new_started_at)
    .bind(new_completed_at)
    .bind(
        new_metadata
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_default()),
    )
    .bind(now)
    .bind(&book_id)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("更新书籍状态失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("书籍状态不存在".to_string());
    }

    get_book_status(app_handle, book_id)
        .await?
        .ok_or_else(|| "更新后无法找到书籍状态".to_string())
}

#[tauri::command]
pub async fn get_books_with_status(
    app_handle: AppHandle,
    options: Option<BookQueryOptions>,
) -> Result<Vec<BookWithStatus>, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let opts = options.unwrap_or_default();

    let mut query = String::from(
        "SELECT b.*, s.book_id as status_book_id, s.status, s.progress_current, s.progress_total, 
         s.last_read_at, s.started_at, 
         s.completed_at, s.metadata, s.created_at as status_created_at, s.updated_at as status_updated_at 
         FROM books b LEFT JOIN book_status s ON b.id = s.book_id"
    );
    let mut conditions = Vec::new();

    if let Some(search_query) = &opts.search_query {
        if !search_query.trim().is_empty() {
            conditions.push("(b.title LIKE ? OR b.author LIKE ?)");
        }
    }

    let tag_condition = if let Some(tags) = &opts.tags {
        if !tags.is_empty() {
            let tag_conditions: Vec<String> =
                tags.iter().map(|_| "b.tags LIKE ?".to_string()).collect();
            Some(format!("({})", tag_conditions.join(" OR ")))
        } else {
            None
        }
    } else {
        None
    };

    if let Some(ref condition) = tag_condition {
        conditions.push(condition);
    }

    if !conditions.is_empty() {
        query.push_str(&format!(" WHERE {}", conditions.join(" AND ")));
    }

    if let Some(sort_by) = &opts.sort_by {
        let order = opts.sort_order.as_deref().unwrap_or("asc");
        match sort_by.as_str() {
            "title" => query.push_str(&format!(" ORDER BY b.title {}", order)),
            "author" => query.push_str(&format!(" ORDER BY b.author {}", order)),
            "createdAt" => query.push_str(&format!(" ORDER BY b.created_at {}", order)),
            "updatedAt" => query.push_str(&format!(" ORDER BY b.updated_at {}", order)),
            _ => query.push_str(" ORDER BY b.updated_at DESC"),
        }
    } else {
        query.push_str(" ORDER BY b.updated_at DESC");
    }

    if let Some(limit) = opts.limit {
        query.push_str(&format!(" LIMIT {}", limit));
        if let Some(offset) = opts.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }
    }

    let mut sql_query = sqlx::query(&query);

    let search_patterns = if let Some(search_query) = &opts.search_query {
        if !search_query.trim().is_empty() {
            let pattern = format!("%{}%", search_query);
            Some((pattern.clone(), pattern))
        } else {
            None
        }
    } else {
        None
    };

    if let Some((pattern1, pattern2)) = &search_patterns {
        sql_query = sql_query.bind(pattern1).bind(pattern2);
    }

    let tag_patterns: Vec<String> = if let Some(tags) = &opts.tags {
        tags.iter().map(|tag| format!("%\"{}\"", tag)).collect()
    } else {
        Vec::new()
    };

    for tag_pattern in &tag_patterns {
        sql_query = sql_query.bind(tag_pattern);
    }

    let rows = sql_query
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("查询书籍失败: {}", e))?;

    let mut results = Vec::new();
    for row in rows {
        let book = SimpleBook::from_db_row(&row).map_err(|e| format!("解析书籍数据失败: {}", e))?;

        let status = if row
            .try_get::<Option<String>, _>("status_book_id")
            .unwrap_or(None)
            .is_some()
        {
            Some(BookStatus {
                book_id: row.try_get("status_book_id").unwrap_or_default(),
                status: row.try_get("status").unwrap_or_default(),
                progress_current: row.try_get("progress_current").unwrap_or_default(),
                progress_total: row.try_get("progress_total").unwrap_or_default(),
                location: row.try_get("location").unwrap_or_default(),
                last_read_at: row.try_get("last_read_at").unwrap_or_default(),
                started_at: row.try_get("started_at").unwrap_or_default(),
                completed_at: row.try_get("completed_at").unwrap_or_default(),
                metadata: {
                    let metadata_str: Option<String> = row.try_get("metadata").unwrap_or_default();
                    metadata_str.and_then(|s| serde_json::from_str(&s).ok())
                },
                created_at: row.try_get("status_created_at").unwrap_or_default(),
                updated_at: row.try_get("status_updated_at").unwrap_or_default(),
            })
        } else {
            None
        };

        results.push(BookWithStatus { book, status });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_book_with_status_by_id(
    app_handle: AppHandle,
    id: String,
) -> Result<Option<BookWithStatus>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let query = "SELECT b.*, s.book_id as status_book_id, s.status, s.progress_current, s.progress_total, 
         s.location, s.last_read_at, s.started_at, 
         s.completed_at, s.metadata, s.created_at as status_created_at, s.updated_at as status_updated_at 
         FROM books b LEFT JOIN book_status s ON b.id = s.book_id
         WHERE b.id = ?";

    let row = sqlx::query(query)
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询书籍失败: {}", e))?;

    match row {
        Some(row) => {
            let book =
                SimpleBook::from_db_row(&row).map_err(|e| format!("解析书籍数据失败: {}", e))?;

            let status = if row
                .try_get::<Option<String>, _>("status_book_id")
                .unwrap_or(None)
                .is_some()
            {
                Some(BookStatus {
                    book_id: row.try_get("status_book_id").unwrap_or_default(),
                    status: row.try_get("status").unwrap_or_default(),
                    progress_current: row.try_get("progress_current").unwrap_or_default(),
                    progress_total: row.try_get("progress_total").unwrap_or_default(),
                    location: row.try_get("location").unwrap_or_default(),
                    last_read_at: row.try_get("last_read_at").unwrap_or_default(),
                    started_at: row.try_get("started_at").unwrap_or_default(),
                    completed_at: row.try_get("completed_at").unwrap_or_default(),
                    metadata: {
                        let metadata_str: Option<String> =
                            row.try_get("metadata").unwrap_or_default();
                        metadata_str.and_then(|s| serde_json::from_str(&s).ok())
                    },
                    created_at: row.try_get("status_created_at").unwrap_or_default(),
                    updated_at: row.try_get("status_updated_at").unwrap_or_default(),
                })
            } else {
                None
            };

            Ok(Some(BookWithStatus { book, status }))
        }
        None => Ok(None),
    }
}

async fn get_db_pool(app_handle: &AppHandle) -> Result<SqlitePool, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用目录失败: {}", e))?;

    let db_path = app_data_dir.join("database").join("app.db");
    let db_url = format!("sqlite:{}", db_path.display());

    SqlitePool::connect(&db_url)
        .await
        .map_err(|e| format!("数据库连接失败: {}", e))
}

impl Default for BookQueryOptions {
    fn default() -> Self {
        Self {
            limit: None,
            offset: None,
            search_query: None,
            tags: None,
            sort_by: None,
            sort_order: None,
        }
    }
}

// ReadingSession 相关命令函数

#[tauri::command]
pub async fn create_reading_session(
    app_handle: AppHandle,
    data: ReadingSessionCreateData,
) -> Result<ReadingSession, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let session = ReadingSession::new(data.book_id.clone(), data.started_at);

    sqlx::query(
        r#"
        INSERT INTO reading_sessions (
            id, book_id, started_at, ended_at, duration_seconds, 
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&session.id)
    .bind(&session.book_id)
    .bind(session.started_at)
    .bind(session.ended_at)
    .bind(session.duration_seconds)
    .bind(session.created_at)
    .bind(session.updated_at)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建阅读会话失败: {}", e))?;

    Ok(session)
}

#[tauri::command]
pub async fn get_reading_session(
    app_handle: AppHandle,
    session_id: String,
) -> Result<Option<ReadingSession>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM reading_sessions WHERE id = ?")
        .bind(&session_id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询阅读会话失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            ReadingSession::from_db_row(&row)
                .map_err(|e| format!("解析阅读会话数据失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_reading_session(
    app_handle: AppHandle,
    session_id: String,
    update_data: ReadingSessionUpdateData,
) -> Result<ReadingSession, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    // 获取当前会话数据
    let current_session = get_reading_session(app_handle.clone(), session_id.clone())
        .await?
        .ok_or_else(|| "阅读会话不存在".to_string())?;

    // 准备更新的数据
    let new_ended_at = update_data.ended_at.or(current_session.ended_at);
    let new_duration_seconds = update_data
        .duration_seconds
        .unwrap_or(current_session.duration_seconds);

    sqlx::query(
        r#"
        UPDATE reading_sessions SET 
            ended_at = ?, duration_seconds = ?, updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(new_ended_at)
    .bind(new_duration_seconds)
    .bind(now)
    .bind(&session_id)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("更新阅读会话失败: {}", e))?;

    get_reading_session(app_handle, session_id)
        .await?
        .ok_or_else(|| "更新后无法找到阅读会话".to_string())
}

#[tauri::command]
pub async fn get_reading_sessions_by_book(
    app_handle: AppHandle,
    book_id: String,
    limit: Option<i64>,
) -> Result<Vec<ReadingSession>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let mut query =
        String::from("SELECT * FROM reading_sessions WHERE book_id = ? ORDER BY started_at DESC");

    if let Some(limit_value) = limit {
        query.push_str(&format!(" LIMIT {}", limit_value));
    }

    let rows = sqlx::query(&query)
        .bind(&book_id)
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("查询阅读会话列表失败: {}", e))?;

    let sessions: Result<Vec<ReadingSession>, sqlx::Error> =
        rows.iter().map(ReadingSession::from_db_row).collect();

    sessions.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn get_active_reading_session(
    app_handle: AppHandle,
    book_id: String,
) -> Result<Option<ReadingSession>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM reading_sessions WHERE book_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1")
        .bind(&book_id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询活跃阅读会话失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            ReadingSession::from_db_row(&row)
                .map_err(|e| format!("解析阅读会话数据失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_all_reading_sessions(
    app_handle: AppHandle,
    limit: Option<i64>,
    start_date: Option<i64>,
    end_date: Option<i64>,
) -> Result<Vec<ReadingSession>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let mut query = String::from("SELECT * FROM reading_sessions WHERE 1=1");

    // 添加日期过滤
    if let Some(_start) = start_date {
        query.push_str(" AND started_at >= ?");
    }

    if let Some(_end) = end_date {
        query.push_str(" AND started_at <= ?");
    }

    query.push_str(" ORDER BY started_at DESC");

    if let Some(limit_value) = limit {
        query.push_str(&format!(" LIMIT {}", limit_value));
    }

    let mut sqlx_query = sqlx::query(&query);

    if let Some(start) = start_date {
        sqlx_query = sqlx_query.bind(start);
    }

    if let Some(end) = end_date {
        sqlx_query = sqlx_query.bind(end);
    }

    let rows = sqlx_query
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("查询所有阅读会话失败: {}", e))?;

    let sessions: Result<Vec<ReadingSession>, sqlx::Error> =
        rows.iter().map(ReadingSession::from_db_row).collect();

    sessions.map_err(|e| format!("转换查询结果失败: {}", e))
}

// ==================== BookNote 相关命令 ====================

#[tauri::command]
pub async fn create_book_note(
    app_handle: AppHandle,
    note_data: BookNoteCreateData,
) -> Result<BookNote, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let id = uuid::Uuid::new_v4().to_string();

    // 提取 context 中的 before 和 after
    let (context_before, context_after) = if let Some(ref ctx) = note_data.context {
        (
            ctx.get("before")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            ctx.get("after")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        )
    } else {
        (None, None)
    };

    let book_note = BookNote::new(
        id.clone(),
        note_data.book_id,
        note_data.r#type,
        note_data.cfi,
        note_data.text,
        note_data.style,
        note_data.color,
        note_data.note,
        note_data.context,
    );

    sqlx::query(
        r#"
        INSERT INTO book_notes (id, book_id, type, cfi, text, style, color, note, context_before, context_after, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        "#
    )
    .bind(&book_note.id)
    .bind(&book_note.book_id)
    .bind(&book_note.r#type)
    .bind(&book_note.cfi)
    .bind(&book_note.text)
    .bind(&book_note.style)
    .bind(&book_note.color)
    .bind(&book_note.note)
    .bind(&context_before)
    .bind(&context_after)
    .bind(book_note.created_at)
    .bind(book_note.updated_at)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建笔记失败: {}", e))?;

    Ok(book_note)
}

#[tauri::command]
pub async fn get_book_notes(
    app_handle: AppHandle,
    book_id: String,
) -> Result<Vec<BookNote>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let rows = sqlx::query(
        r#"
        SELECT id, book_id, type, cfi, text, style, color, note, context_before, context_after, created_at, updated_at
        FROM book_notes
        WHERE book_id = ?1
        ORDER BY created_at ASC
        "#
    )
    .bind(&book_id)
    .fetch_all(&db_pool)
    .await
    .map_err(|e| format!("查询笔记失败: {}", e))?;

    let notes: Result<Vec<BookNote>, sqlx::Error> =
        rows.iter().map(BookNote::from_db_row).collect();

    notes.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn update_book_note(
    app_handle: AppHandle,
    id: String,
    update_data: BookNoteUpdateData,
) -> Result<BookNote, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    // 提取 context 中的 before 和 after
    let (context_before, context_after) = if let Some(ref ctx) = update_data.context {
        (
            ctx.get("before")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            ctx.get("after")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
        )
    } else {
        (None, None)
    };

    // 简化：只更新提供的字段，使用单独的查询
    let query = sqlx::query(
        r#"
        UPDATE book_notes 
        SET type = COALESCE(?, type),
            cfi = COALESCE(?, cfi),
            text = COALESCE(?, text),
            style = COALESCE(?, style),
            color = COALESCE(?, color),
            note = COALESCE(?, note),
            context_before = COALESCE(?, context_before),
            context_after = COALESCE(?, context_after),
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&update_data.r#type)
    .bind(&update_data.cfi)
    .bind(&update_data.text)
    .bind(&update_data.style)
    .bind(&update_data.color)
    .bind(&update_data.note)
    .bind(&context_before)
    .bind(&context_after)
    .bind(now)
    .bind(&id);

    let result = query
        .execute(&db_pool)
        .await
        .map_err(|e| format!("更新笔记失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("笔记不存在".to_string());
    }

    // 查询更新后的笔记
    let row = sqlx::query(
        r#"
        SELECT id, book_id, type, cfi, text, style, color, note, context_before, context_after, created_at, updated_at
        FROM book_notes
        WHERE id = ?1
        "#
    )
    .bind(&id)
    .fetch_one(&db_pool)
    .await
    .map_err(|e| format!("查询更新后的笔记失败: {}", e))?;

    BookNote::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn delete_book_note(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let result = sqlx::query("DELETE FROM book_notes WHERE id = ?1")
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除笔记失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("笔记不存在".to_string());
    }

    Ok(())
}
