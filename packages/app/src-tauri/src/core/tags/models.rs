use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct TagCreateData {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct TagUpdateData {
    pub name: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<i64>,
}

impl Tag {
    pub fn new(id: String, name: String, color: Option<String>) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id,
            name,
            color,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        Ok(Self {
            id: row.try_get("id")?,
            name: row.try_get("name")?,
            color: row.try_get("color")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}
