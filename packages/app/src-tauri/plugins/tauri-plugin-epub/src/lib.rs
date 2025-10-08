use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod state;

// Data models
mod models;

// Configuration
mod config;

// Feature modules
mod epub;
mod text;
mod database;

// Core modules
mod pipeline;

pub use state::EpubState;

/// Initializes the EPUB plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("epub")
        .invoke_handler(tauri::generate_handler![
            commands::parse_epub,
            commands::index_epub,
            commands::search_db,
            commands::convert_to_mdbook,
            commands::parse_toc,
            commands::get_chunk_with_context,
            commands::get_toc_chunks,
            commands::get_chunks_by_range,
        ])
        .setup(|app, _api| {
            // Initialize and manage plugin state
            app.manage(EpubState::default());
            Ok(())
        })
        .build()
}
