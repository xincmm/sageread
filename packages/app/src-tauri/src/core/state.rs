use sqlx::SqlitePool;
use tokio::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub db_pool: Mutex<Option<SqlitePool>>,
}
