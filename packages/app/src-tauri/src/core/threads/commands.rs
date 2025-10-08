use super::models::{EditThreadPayload, NewThreadPayload, Thread, ThreadSummary};
use crate::core::state::AppState;
use serde_json;
use sqlx::Row;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_thread(
    payload: NewThreadPayload,
    state: State<'_, AppState>,
) -> Result<Thread, String> {
    let thread_id = Uuid::new_v4().to_string();
    let current_timestamp = chrono::Utc::now().timestamp_millis();

    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    sqlx::query(
        "INSERT INTO threads (id, book_id, metadata, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&thread_id)
    .bind(&payload.book_id)
    .bind(&payload.metadata)
    .bind(&payload.title)
    .bind(&payload.messages_json)
    .bind(current_timestamp)
    .bind(current_timestamp)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to create thread: {}", e);
        e.to_string()
    })?;

    let new_thread = Thread {
        id: thread_id,
        book_id: payload.book_id,
        metadata: payload.metadata,
        title: payload.title,
        messages: payload.messages_json,
        created_at: current_timestamp,
        updated_at: current_timestamp,
    };
    Ok(new_thread)
}

#[tauri::command]
pub async fn edit_thread(
    payload: EditThreadPayload,
    state: State<'_, AppState>,
) -> Result<Thread, String> {
    let current_timestamp = chrono::Utc::now().timestamp_millis();

    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let row = sqlx::query(
        "SELECT id, book_id, metadata, title, messages, created_at, updated_at FROM threads WHERE id = ?"
    )
    .bind(&payload.id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch existing thread: {}", e);
        "Thread not found".to_string()
    })?;

    let existing_thread = Thread {
        id: row.get("id"),
        book_id: row.get("book_id"),
        metadata: row.get("metadata"),
        title: row.get("title"),
        messages: row.get("messages"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let new_title = payload.title.unwrap_or(existing_thread.title);
    let new_metadata = payload.metadata.unwrap_or(existing_thread.metadata);
    let new_messages = payload.messages_json.unwrap_or(existing_thread.messages);

    sqlx::query(
        "UPDATE threads SET title = ?, metadata = ?, messages = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&new_title)
    .bind(&new_metadata)
    .bind(&new_messages)
    .bind(current_timestamp)
    .bind(&payload.id)
    .execute(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to update thread: {}", e);
        e.to_string()
    })?;

    let updated_thread = Thread {
        id: existing_thread.id,
        book_id: existing_thread.book_id,
        metadata: new_metadata,
        title: new_title,
        messages: new_messages,
        created_at: existing_thread.created_at,
        updated_at: current_timestamp,
    };

    Ok(updated_thread)
}

#[tauri::command]
pub async fn get_latest_thread_by_book_id(
    book_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Option<Thread>, String> {
    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let row_result = sqlx::query(
        "SELECT id, book_id, metadata, title, messages, created_at, updated_at FROM threads WHERE book_id IS ? ORDER BY updated_at DESC LIMIT 1"
    )
    .bind(&book_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch latest thread by book_id: {}", e);
        e.to_string()
    })?;

    if let Some(row) = row_result {
        let thread = Thread {
            id: row.get("id"),
            book_id: row.get("book_id"),
            metadata: row.get("metadata"),
            title: row.get("title"),
            messages: row.get("messages"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        };
        Ok(Some(thread))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_threads_by_book_id(
    book_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ThreadSummary>, String> {
    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let rows = sqlx::query(
        "SELECT id, book_id, metadata, title, messages, created_at, updated_at FROM threads WHERE book_id IS ? ORDER BY updated_at DESC"
    )
    .bind(&book_id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch threads by book_id: {}", e);
        e.to_string()
    })?;

    let thread_summaries: Vec<ThreadSummary> = rows
        .into_iter()
        .map(|row| {
            let messages_json: String = row.get("messages");
            let message_count = match serde_json::from_str::<serde_json::Value>(&messages_json) {
                Ok(messages_array) => {
                    if let Some(array) = messages_array.as_array() {
                        array.len() as i32
                    } else {
                        0
                    }
                }
                Err(_) => 0,
            };

            ThreadSummary {
                id: row.get("id"),
                book_id: row.get("book_id"),
                metadata: row.get("metadata"),
                title: row.get("title"),
                message_count,
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }
        })
        .collect();

    Ok(thread_summaries)
}

#[tauri::command]
pub async fn get_all_threads(state: State<'_, AppState>) -> Result<Vec<ThreadSummary>, String> {
    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let rows = sqlx::query(
        "SELECT id, book_id, metadata, title, messages, created_at, updated_at FROM threads ORDER BY updated_at DESC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch all threads: {}", e);
        e.to_string()
    })?;

    let thread_summaries: Vec<ThreadSummary> = rows
        .into_iter()
        .map(|row| {
            let messages_json: String = row.get("messages");
            let message_count = match serde_json::from_str::<serde_json::Value>(&messages_json) {
                Ok(messages_array) => {
                    if let Some(array) = messages_array.as_array() {
                        array.len() as i32
                    } else {
                        0
                    }
                }
                Err(_) => 0,
            };

            ThreadSummary {
                id: row.get("id"),
                book_id: row.get("book_id"),
                metadata: row.get("metadata"),
                title: row.get("title"),
                message_count,
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }
        })
        .collect();

    Ok(thread_summaries)
}

#[tauri::command]
pub async fn get_thread_by_id(
    thread_id: String,
    state: State<'_, AppState>,
) -> Result<Thread, String> {
    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let row = sqlx::query(
        "SELECT id, book_id, metadata, title, messages, created_at, updated_at FROM threads WHERE id = ?"
    )
    .bind(&thread_id)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch thread by id: {}", e);
        "Thread not found".to_string()
    })?;

    let thread = Thread {
        id: row.get("id"),
        book_id: row.get("book_id"),
        metadata: row.get("metadata"),
        title: row.get("title"),
        messages: row.get("messages"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    Ok(thread)
}

#[tauri::command]
pub async fn delete_thread(thread_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let db_pool_guard = state.db_pool.lock().await;
    let pool = db_pool_guard.as_ref().ok_or("Database not initialized")?;

    let result = sqlx::query("DELETE FROM threads WHERE id = ?")
        .bind(&thread_id)
        .execute(pool)
        .await
        .map_err(|e| {
            eprintln!("Failed to delete thread: {}", e);
            e.to_string()
        })?;

    if result.rows_affected() == 0 {
        return Err("Thread not found".to_string());
    }

    Ok(())
}
