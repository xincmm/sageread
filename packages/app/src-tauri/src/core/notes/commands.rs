use super::models::*;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[tauri::command]
pub async fn create_note(app_handle: AppHandle, data: CreateNoteData) -> Result<Note, String> {
    // 验证输入数据
    data.validate()?;

    let db_pool = get_db_pool(&app_handle).await?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    // 将book_meta序列化为JSON字符串
    let book_meta_json = if let Some(ref meta) = data.book_meta {
        Some(serde_json::to_string(meta).map_err(|e| format!("序列化书籍信息失败: {}", e))?)
    } else {
        None
    };

    sqlx::query(
        r#"
        INSERT INTO notes (
            id, book_id, book_meta, title, content, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&data.book_id)
    .bind(&book_meta_json)
    .bind(&data.title)
    .bind(&data.content)
    .bind(now)
    .bind(now)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建笔记失败: {}", e))?;

    Ok(Note::new(
        id,
        data.book_id,
        data.book_meta,
        data.title,
        data.content,
        now,
        now,
    ))
}

#[tauri::command]
pub async fn update_note(app_handle: AppHandle, data: UpdateNoteData) -> Result<Note, String> {
    // 验证输入数据
    data.validate()?;

    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    // 构建动态更新查询
    let mut has_updates = false;
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE notes SET ");
    let mut separated = query_builder.separated(", ");

    if let Some(book_id_opt) = &data.book_id {
        has_updates = true;
        separated.push("book_id = ").push_bind(book_id_opt.clone());
    }

    if let Some(book_meta_opt) = &data.book_meta {
        has_updates = true;
        let book_meta_json = if let Some(ref meta) = book_meta_opt {
            Some(serde_json::to_string(meta).map_err(|e| format!("序列化书籍信息失败: {}", e))?)
        } else {
            None
        };
        separated.push("book_meta = ").push_bind(book_meta_json);
    }

    if let Some(title_opt) = &data.title {
        has_updates = true;
        separated.push("title = ").push_bind(title_opt.clone());
    }

    if let Some(content_opt) = &data.content {
        has_updates = true;
        separated.push("content = ").push_bind(content_opt.clone());
    }

    if !has_updates {
        return Err("没有需要更新的字段".to_string());
    }

    separated.push("updated_at = ").push_bind(now);

    query_builder.push(" WHERE id = ").push_bind(&data.id);

    let query = query_builder.build();

    let result = query
        .execute(&db_pool)
        .await
        .map_err(|e| format!("更新笔记失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("笔记不存在".to_string());
    }

    // 获取更新后的笔记
    get_note_by_id(app_handle, data.id.clone())
        .await?
        .ok_or("更新后获取笔记失败".to_string())
}

#[tauri::command]
pub async fn delete_note(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let result = sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除笔记失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("笔记不存在".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_note_by_id(app_handle: AppHandle, id: String) -> Result<Option<Note>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM notes WHERE id = ?")
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询笔记失败: {}", e))?;

    match row {
        Some(row) => {
            let note = Note::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?;
            Ok(Some(note))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_notes(
    app_handle: AppHandle,
    options: Option<NoteQueryOptions>,
) -> Result<Vec<Note>, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let opts = options.unwrap_or_default();

    // 排序
    let sort_by = opts.sort_by.as_deref().unwrap_or("updated_at");
    let sort_order = opts.sort_order.as_deref().unwrap_or("desc");

    let valid_sort_fields = ["updated_at", "created_at", "title"];
    let sort_field = if valid_sort_fields.contains(&sort_by) {
        sort_by
    } else {
        "updated_at"
    };

    let order = if sort_order.to_lowercase() == "asc" {
        "ASC"
    } else {
        "DESC"
    };

    // 分页
    let limit = opts.limit.unwrap_or(50);
    let offset = opts.offset.unwrap_or(0);

    let rows = execute_normal_query(&db_pool, &opts, sort_field, order, limit, offset).await;

    let rows = rows.map_err(|e| format!("查询笔记失败: {}", e))?;

    let notes: Result<Vec<Note>, sqlx::Error> = rows.iter().map(Note::from_db_row).collect();

    notes.map_err(|e| format!("转换查询结果失败: {}", e))
}

async fn execute_normal_query(
    db_pool: &SqlitePool,
    opts: &NoteQueryOptions,
    sort_field: &str,
    order: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<sqlx::sqlite::SqliteRow>, sqlx::Error> {
    let mut query_builder = sqlx::QueryBuilder::new("SELECT * FROM notes");

    if let Some(ref book_id) = opts.book_id {
        query_builder.push(" WHERE book_id = ").push_bind(book_id);
    }

    query_builder.push(&format!(" ORDER BY {} {}", sort_field, order));
    query_builder.push(&format!(" LIMIT {} OFFSET {}", limit, offset));

    query_builder.build().fetch_all(db_pool).await
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
