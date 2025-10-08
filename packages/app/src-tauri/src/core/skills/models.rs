use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub content: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "isSystem")]
    pub is_system: bool,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct SkillCreateData {
    pub name: String,
    pub content: String,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
    #[serde(rename = "isSystem")]
    pub is_system: Option<bool>,
}

#[derive(Deserialize, Debug)]
pub struct SkillUpdateData {
    pub name: Option<String>,
    pub content: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<i64>,
}

impl Skill {
    pub fn new(id: String, name: String, content: String, is_active: bool, is_system: bool) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id,
            name,
            content,
            is_active,
            is_system,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        Ok(Self {
            id: row.try_get("id")?,
            name: row.try_get("name")?,
            content: row.try_get("content")?,
            is_active: row.try_get::<i32, _>("is_active")? != 0,
            is_system: row.try_get::<i32, _>("is_system")? != 0,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}
