const COMMANDS: &[&str] = &[
    "parse_epub",
    "index_epub",
    "search_db",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
