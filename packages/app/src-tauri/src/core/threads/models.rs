use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
pub struct Thread {
    pub id: String,
    pub book_id: Option<String>,
    pub metadata: String,
    pub title: String,
    pub messages: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Debug)]
pub struct ThreadSummary {
    pub id: String,
    pub book_id: Option<String>,
    pub metadata: String,
    pub title: String,
    pub message_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Deserialize, Debug)]
pub struct NewThreadPayload {
    pub book_id: Option<String>,
    pub title: String,
    pub metadata: String,
    pub messages_json: String,
}

#[derive(Deserialize, Debug)]
pub struct EditThreadPayload {
    pub id: String,
    pub title: Option<String>,
    pub metadata: Option<String>,
    pub messages_json: Option<String>,
}
