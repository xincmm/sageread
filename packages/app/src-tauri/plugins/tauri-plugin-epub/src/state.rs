use std::collections::HashMap;
use tokio::sync::Mutex;

#[derive(Default)]
pub struct EpubState {
    // Example: track simple statuses by a book ID or file path
    pub statuses: Mutex<HashMap<String, String>>,
}

