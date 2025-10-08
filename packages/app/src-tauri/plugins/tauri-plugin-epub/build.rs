const COMMANDS: &[&str] = &[
    "parse_epub",
    "index_epub",
    "search_db",
    "convert_to_mdbook",
    "parse_toc",
    "get_chunk_with_context",
    "get_toc_chunks",
    "get_chunks_by_range",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
