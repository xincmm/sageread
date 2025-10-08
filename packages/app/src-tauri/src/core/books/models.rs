use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimpleBook {
    pub id: String,
    pub title: String,
    pub author: String,
    pub format: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    #[serde(rename = "coverPath")]
    pub cover_path: Option<String>,
    #[serde(rename = "fileSize")]
    pub file_size: i64,
    pub language: String,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct BookUploadData {
    pub id: String,
    pub title: String,
    pub author: String,
    pub format: String,
    #[serde(rename = "fileSize")]
    pub file_size: i64,
    pub language: String,
    #[serde(rename = "tempFilePath")]
    pub temp_file_path: String,
    #[serde(rename = "coverTempFilePath")]
    pub cover_temp_file_path: Option<String>,
    pub metadata: serde_json::Value,
}

#[derive(Deserialize, Debug)]
pub struct BookQueryOptions {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    #[serde(rename = "searchQuery")]
    pub search_query: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "sortBy")]
    pub sort_by: Option<String>,
    #[serde(rename = "sortOrder")]
    pub sort_order: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct BookUpdateData {
    pub title: Option<String>,
    pub author: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookStatus {
    #[serde(rename = "bookId")]
    pub book_id: String,
    pub status: String, // 'unread', 'reading', 'completed'
    #[serde(rename = "progressCurrent")]
    pub progress_current: i64,
    #[serde(rename = "progressTotal")]
    pub progress_total: i64,
    pub location: String,
    #[serde(rename = "lastReadAt")]
    pub last_read_at: Option<i64>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<i64>,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<i64>,
    pub metadata: Option<serde_json::Value>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct BookStatusUpdateData {
    pub status: Option<String>,
    #[serde(rename = "progressCurrent")]
    pub progress_current: Option<i64>,
    #[serde(rename = "progressTotal")]
    pub progress_total: Option<i64>,
    pub location: Option<String>,
    #[serde(rename = "lastReadAt")]
    pub last_read_at: Option<i64>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<i64>,
    #[serde(rename = "completedAt")]
    pub completed_at: Option<i64>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookWithStatus {
    #[serde(flatten)]
    pub book: SimpleBook,
    pub status: Option<BookStatus>,
}

impl SimpleBook {
    pub fn new(
        id: String,
        title: String,
        author: String,
        format: String,
        file_path: String,
        cover_path: Option<String>,
        file_size: i64,
        language: String,
    ) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id,
            title,
            author,
            format,
            file_path,
            cover_path,
            file_size,
            language,
            tags: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        let tags_str: Option<String> = row.try_get("tags")?;
        let tags = tags_str.and_then(|s| serde_json::from_str(&s).ok());

        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            author: row.try_get("author")?,
            format: row.try_get("format")?,
            file_path: row.try_get("file_path")?,
            cover_path: row.try_get("cover_path")?,
            file_size: row.try_get("file_size")?,
            language: row.try_get("language")?,
            tags,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

impl BookStatus {
    #[allow(dead_code)]
    pub fn new(book_id: String) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            book_id,
            status: "unread".to_string(),
            progress_current: 0,
            progress_total: 0,
            location: "".to_string(),
            last_read_at: None,
            started_at: None,
            completed_at: None,
            metadata: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        Ok(Self {
            book_id: row.try_get("book_id")?,
            status: row.try_get("status")?,
            progress_current: row.try_get("progress_current")?,
            progress_total: row.try_get("progress_total")?,
            location: row.try_get("location")?,
            last_read_at: row.try_get("last_read_at")?,
            started_at: row.try_get("started_at")?,
            completed_at: row.try_get("completed_at")?,
            metadata: row
                .try_get::<Option<String>, _>("metadata")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

// ReadingSession 相关结构体
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReadingSession {
    pub id: String,
    #[serde(rename = "bookId")]
    pub book_id: String,
    #[serde(rename = "startedAt")]
    pub started_at: i64,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<i64>,
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: i64,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct ReadingSessionCreateData {
    #[serde(rename = "bookId")]
    pub book_id: String,
    #[serde(rename = "startedAt")]
    pub started_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct ReadingSessionUpdateData {
    #[serde(rename = "endedAt")]
    pub ended_at: Option<i64>,
    #[serde(rename = "durationSeconds")]
    pub duration_seconds: Option<i64>,
}

impl ReadingSession {
    pub fn new(book_id: String, started_at: i64) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        let id = Uuid::new_v4().to_string();

        Self {
            id,
            book_id,
            started_at,
            ended_at: None,
            duration_seconds: 0,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        Ok(Self {
            id: row.try_get("id")?,
            book_id: row.try_get("book_id")?,
            started_at: row.try_get("started_at")?,
            ended_at: row.try_get("ended_at")?,
            duration_seconds: row.try_get("duration_seconds")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

// BookNote 相关结构体
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookNote {
    pub id: String,
    #[serde(rename = "bookId")]
    pub book_id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub cfi: String,
    pub text: Option<String>,
    pub style: Option<String>,
    pub color: Option<String>,
    pub note: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<serde_json::Value>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct BookNoteCreateData {
    #[serde(rename = "bookId")]
    pub book_id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub cfi: String,
    pub text: Option<String>,
    pub style: Option<String>,
    pub color: Option<String>,
    pub note: String,
    pub context: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug)]
pub struct BookNoteUpdateData {
    #[serde(rename = "type")]
    pub r#type: Option<String>,
    pub cfi: Option<String>,
    pub text: Option<String>,
    pub style: Option<String>,
    pub color: Option<String>,
    pub note: Option<String>,
    pub context: Option<serde_json::Value>,
}

impl BookNote {
    pub fn new(
        id: String,
        book_id: String,
        r#type: String,
        cfi: String,
        text: Option<String>,
        style: Option<String>,
        color: Option<String>,
        note: String,
        context: Option<serde_json::Value>,
    ) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id,
            book_id,
            r#type,
            cfi,
            text,
            style,
            color,
            note,
            context,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        let context_before: Option<String> = row.try_get("context_before")?;
        let context_after: Option<String> = row.try_get("context_after")?;

        let context = if context_before.is_some() || context_after.is_some() {
            Some(serde_json::json!({
                "before": context_before.unwrap_or_default(),
                "after": context_after.unwrap_or_default(),
            }))
        } else {
            None
        };

        Ok(Self {
            id: row.try_get("id")?,
            book_id: row.try_get("book_id")?,
            r#type: row.try_get("type")?,
            cfi: row.try_get("cfi")?,
            text: row.try_get("text")?,
            style: row.try_get("style")?,
            color: row.try_get("color")?,
            note: row.try_get("note")?,
            context,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}
