use super::models::*;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[tauri::command]
pub async fn create_tag(app_handle: AppHandle, data: TagCreateData) -> Result<Tag, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    // 检查标签名是否已存在
    let existing_tag = sqlx::query("SELECT * FROM tags WHERE name = ?")
        .bind(&data.name)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("检查标签名失败: {}", e))?;

    if existing_tag.is_some() {
        return Err(format!("标签 '{}' 已存在", data.name));
    }

    let tag_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query(
        r#"
        INSERT INTO tags (id, name, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&tag_id)
    .bind(&data.name)
    .bind(&data.color)
    .bind(now)
    .bind(now)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建标签失败: {}", e))?;

    Ok(Tag::new(tag_id, data.name, data.color))
}

#[tauri::command]
pub async fn get_tags(app_handle: AppHandle) -> Result<Vec<Tag>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let rows = sqlx::query("SELECT * FROM tags ORDER BY updated_at DESC")
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("获取标签列表失败: {}", e))?;

    let tags: Result<Vec<Tag>, sqlx::Error> = rows.iter().map(Tag::from_db_row).collect();

    tags.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn get_tag_by_id(app_handle: AppHandle, id: String) -> Result<Option<Tag>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM tags WHERE id = ?")
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询标签失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            Tag::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_tag_by_name(app_handle: AppHandle, name: String) -> Result<Option<Tag>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM tags WHERE name = ?")
        .bind(&name)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询标签失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            Tag::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_tag(
    app_handle: AppHandle,
    id: String,
    update_data: TagUpdateData,
) -> Result<Tag, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = update_data
        .updated_at
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

    // 如果更新名称，检查名称是否已被其他标签使用
    if let Some(ref name) = update_data.name {
        let existing_tag = sqlx::query("SELECT * FROM tags WHERE name = ? AND id != ?")
            .bind(name)
            .bind(&id)
            .fetch_optional(&db_pool)
            .await
            .map_err(|e| format!("检查标签名失败: {}", e))?;

        if existing_tag.is_some() {
            return Err(format!("标签名 '{}' 已被其他标签使用", name));
        }
    }

    if let Some(name) = &update_data.name {
        sqlx::query("UPDATE tags SET name = ?, updated_at = ? WHERE id = ?")
            .bind(name)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新标签名失败: {}", e))?;
    }

    if let Some(color) = &update_data.color {
        sqlx::query("UPDATE tags SET color = ?, updated_at = ? WHERE id = ?")
            .bind(color)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新标签颜色失败: {}", e))?;
    }

    if update_data.name.is_none() && update_data.color.is_none() {
        sqlx::query("UPDATE tags SET updated_at = ? WHERE id = ?")
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新时间戳失败: {}", e))?;
    }

    get_tag_by_id(app_handle, id)
        .await?
        .ok_or_else(|| "更新后无法找到标签".to_string())
}

#[tauri::command]
pub async fn delete_tag(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let result = sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除标签失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("标签不存在".to_string());
    }

    Ok(())
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
