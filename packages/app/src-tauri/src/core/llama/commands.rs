use futures_util::StreamExt;
use std::io::Write;
use std::process::Command;
use tauri::{AppHandle, Emitter};

use super::{
    app_data_dir, backends_root, lib_root, llama_backend_download_url, llama_backend_path,
    llama_server_binary_name, models_root,
};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app_data_dir(&app).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_llamacpp_backend_path(app: AppHandle) -> Result<String, String> {
    let path = llama_backend_path(&app)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn ensure_llamacpp_directories(app: AppHandle) -> Result<String, String> {
    let llamacpp_dir = app_data_dir(&app)?.join(super::LLAMACPP_DIR);
    let backends_dir = backends_root(&app)?;
    let models_dir = models_root(&app)?;
    let lib_dir = lib_root(&app)?;

    std::fs::create_dir_all(&backends_dir)
        .map_err(|e| format!("Failed to create backends directory: {}", e))?;
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;
    std::fs::create_dir_all(&lib_dir)
        .map_err(|e| format!("Failed to create lib directory: {}", e))?;

    log::info!(
        "Created llamacpp directories at: {}",
        llamacpp_dir.display()
    );
    Ok(format!(
        "LlamaCpp directories created at: {}",
        llamacpp_dir.to_string_lossy()
    ))
}

#[tauri::command]
pub async fn download_llama_server(app: AppHandle) -> Result<String, String> {
    let backend_path = llama_backend_path(&app)?;

    if backend_path.exists() {
        return Ok(format!(
            "llama-server already exists at: {}",
            backend_path.to_string_lossy()
        ));
    }

    log::info!("开始下载 llama-server 到: {}", backend_path.display());

    if let Some(parent) = backend_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    let download_url = llama_backend_download_url()?;
    log::info!("正在从 {} 下载后端", download_url);

    let temp_file = format!("{}.download", backend_path.to_string_lossy());
    let download_result = Command::new("curl")
        .args(["-L", "-o", &temp_file, &download_url])
        .output();

    match download_result {
        Ok(output) if output.status.success() => {
            log::info!("下载完成，开始解压...");

            // Extract to backends/<version>/
            let extract_dir = backend_path
                .parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
                .ok_or_else(|| "Failed to resolve extract dir".to_string())?;

            log::info!("解压到目录: {}", extract_dir.display());

            let extract_result = Command::new("unzip")
                .args(["-o", &temp_file, "-d", extract_dir.to_str().unwrap()])
                .output();

            match extract_result {
                Ok(extract_output) if extract_output.status.success() => {
                    let _ = std::fs::remove_file(&temp_file);

                    if backend_path.exists() {
                        #[cfg(unix)]
                        {
                            use std::os::unix::fs::PermissionsExt;
                            let mut perms = std::fs::metadata(&backend_path)
                                .map_err(|e| e.to_string())?
                                .permissions();
                            perms.set_mode(0o755);
                            let _ = std::fs::set_permissions(&backend_path, perms);
                        }

                        Ok(format!(
                            "✅ llama-server 下载并解压成功: {}",
                            backend_path.to_string_lossy()
                        ))
                    } else {
                        Err(format!(
                            "解压后未找到 llama-server 文件: {}",
                            backend_path.to_string_lossy()
                        ))
                    }
                }
                Ok(extract_output) => {
                    let stderr = String::from_utf8_lossy(&extract_output.stderr);
                    Err(format!("解压失败: {}", stderr))
                }
                Err(e) => Err(format!("解压命令执行失败: {}", e)),
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("下载失败: {}", stderr))
        }
        Err(e) => Err(format!("下载命令执行失败: {}", e)),
    }
}

// Utility: expose only the binary name for consumers if needed
#[tauri::command]
pub fn llama_server_binary_name_cmd() -> String {
    llama_server_binary_name().to_string()
}

#[tauri::command]
pub async fn list_local_models(app: AppHandle) -> Result<Vec<String>, String> {
    let models_dir = models_root(&app)?;

    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir)
            .map_err(|e| format!("Failed to create models directory: {}", e))?;
        return Ok(vec![]);
    }

    let mut models = vec![];
    let entries = std::fs::read_dir(&models_dir)
        .map_err(|e| format!("Failed to read models directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "gguf" {
                        if let Some(file_name) = path.file_name() {
                            models.push(file_name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    models.sort();
    Ok(models)
}

#[tauri::command]
pub async fn delete_local_model(app: AppHandle, filename: String) -> Result<(), String> {
    let models_dir = models_root(&app)?;
    let file_path = models_dir.join(&filename);

    if !file_path.exists() {
        return Err(format!("模型文件不存在: {}", filename));
    }

    if !file_path.is_file() {
        return Err(format!("不是有效的文件: {}", filename));
    }

    if file_path.extension().and_then(|s| s.to_str()) != Some("gguf") {
        return Err("只能删除 .gguf 文件".to_string());
    }

    std::fs::remove_file(&file_path).map_err(|e| format!("删除文件失败: {}", e))?;

    log::info!("已删除模型文件: {}", filename);
    Ok(())
}

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
    percent: f64,
    filename: String,
}

#[derive(Clone, serde::Serialize)]
struct DownloadComplete {
    filename: String,
    success: bool,
    error: Option<String>,
}

#[tauri::command]
pub async fn download_model_file(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<(), String> {
    // 快速验证参数
    let models_dir = models_root(&app)?;
    let file_path = models_dir.join(&filename);

    if file_path.exists() {
        return Err(format!("文件已存在: {}", filename));
    }

    // 在后台任务中执行下载
    tauri::async_runtime::spawn(async move {
        let result = download_model_file_impl(&app, &url, &filename).await;

        // 无论成功失败都发送完成事件
        match &result {
            Ok(path) => {
                let _ = app.emit(
                    "model-download-complete",
                    DownloadComplete {
                        filename: filename.clone(),
                        success: true,
                        error: None,
                    },
                );
                log::info!("模型文件下载成功: {}", path);
            }
            Err(error) => {
                let _ = app.emit(
                    "model-download-complete",
                    DownloadComplete {
                        filename: filename.clone(),
                        success: false,
                        error: Some(error.clone()),
                    },
                );
                log::error!("模型文件下载失败: {}", error);
            }
        }
    });

    // 立即返回，不等待下载完成
    Ok(())
}

async fn download_model_file_impl(
    app: &AppHandle,
    url: &str,
    filename: &str,
) -> Result<String, String> {
    let models_dir = models_root(app)?;

    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;

    let file_path = models_dir.join(filename);

    if file_path.exists() {
        return Err(format!("文件已存在: {}", filename));
    }

    log::info!("开始下载模型文件: {} -> {}", url, file_path.display());

    let temp_file_path = format!("{}.download", file_path.to_string_lossy());

    // 使用 reqwest 流式下载
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP 错误: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(0);
    log::info!("文件总大小: {} bytes", total_size);

    let mut file =
        std::fs::File::create(&temp_file_path).map_err(|e| format!("创建临时文件失败: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut last_update_time = std::time::Instant::now();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("下载数据失败: {}", e))?;

        file.write_all(&chunk)
            .map_err(|e| format!("写入文件失败: {}", e))?;

        downloaded += chunk.len() as u64;

        // 节流：每 500ms 发送一次进度更新
        let now = std::time::Instant::now();
        if now.duration_since(last_update_time).as_millis() >= 500 {
            let percent = if total_size > 0 {
                (downloaded as f64 / total_size as f64) * 100.0
            } else {
                0.0
            };

            let progress = DownloadProgress {
                downloaded,
                total: total_size,
                percent,
                filename: filename.to_string(),
            };

            let _ = app.emit("model-download-progress", progress);
            last_update_time = now;
        }
    }

    // 发送最终的 100% 进度
    let progress = DownloadProgress {
        downloaded,
        total: total_size,
        percent: 100.0,
        filename: filename.to_string(),
    };
    let _ = app.emit("model-download-progress", progress);

    // 下载完成，重命名文件
    std::fs::rename(&temp_file_path, &file_path).map_err(|e| format!("移动文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}
