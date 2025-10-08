use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Centralized constants for paths and versions
pub(crate) const LLAMACPP_DIR: &str = "llamacpp";
pub(crate) const BACKENDS_DIR: &str = "backends";
pub(crate) const MODELS_DIR: &str = "models";
pub(crate) const LIB_DIR: &str = "lib";
pub(crate) const LLAMA_CPP_VERSION: &str = "b6692";

pub mod commands;

// Helpers reused by commands
pub(crate) fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

pub(crate) fn llamacpp_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(LLAMACPP_DIR))
}

pub(crate) fn backends_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(llamacpp_root(app)?
        .join(BACKENDS_DIR)
        .join(LLAMA_CPP_VERSION))
}

pub(crate) fn models_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(llamacpp_root(app)?.join(MODELS_DIR))
}

pub(crate) fn lib_root(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(llamacpp_root(app)?.join(LIB_DIR))
}

pub(crate) fn backend_platform_dir() -> Result<(&'static str, bool), String> {
    // Returns (platform_dir_name, is_zip)
    if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        Ok(("macos-arm64", true))
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "x86_64") {
        Ok(("macos-x64", true))
    } else if cfg!(target_os = "linux") {
        Ok(("ubuntu-x64", true))
    } else if cfg!(target_os = "windows") {
        Ok(("win-avx2-x64", true))
    } else {
        Err("Unsupported platform".to_string())
    }
}

pub(crate) fn llama_server_binary_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    }
}

pub(crate) fn llama_backend_path(app: &AppHandle) -> Result<PathBuf, String> {
    let (platform_dir, _) = backend_platform_dir()?;
    Ok(backends_root(app)?
        .join(platform_dir)
        .join("build")
        .join("bin")
        .join(llama_server_binary_name()))
}

pub(crate) fn llama_backend_download_url() -> Result<String, String> {
    let (platform_dir, _) = backend_platform_dir()?;
    Ok(format!(
        "https://github.com/ggml-org/llama.cpp/releases/download/{ver}/llama-{ver}-bin-{platform}.zip",
        ver = LLAMA_CPP_VERSION,
        platform = platform_dir
    ))
}
