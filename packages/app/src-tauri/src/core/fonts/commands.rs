use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemFontInfo {
    pub family: String,
    pub is_monospace: bool,
    pub sources: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FontInfo {
    pub name: String,
    pub filename: String,
    pub size: u64,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FontConversionStart {
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FontConversionComplete {
    pub filename: String,
    pub success: bool,
    pub duration_secs: f64,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn upload_and_convert_font(
    app: AppHandle,
    file_path: String,
) -> Result<FontInfo, String> {
    let source_path = PathBuf::from(&file_path);
    
    if !source_path.exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    let file_name = source_path
        .file_name()
        .ok_or("无效的文件名")?
        .to_string_lossy()
        .to_string();

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    
    let fonts_dir = app_data_dir.join("fonts");
    
    if !fonts_dir.exists() {
        fs::create_dir_all(&fonts_dir)
            .map_err(|e| format!("创建字体目录失败: {}", e))?;
    }

    let file_ext = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or("无效的文件扩展名")?
        .to_lowercase();

    match file_ext.as_str() {
        "woff2" => {
            let dest_path = fonts_dir.join(&file_name);
            fs::copy(&source_path, &dest_path)
                .map_err(|e| format!("复制文件失败: {}", e))?;
            
            let metadata = fs::metadata(&dest_path)
                .map_err(|e| format!("读取文件信息失败: {}", e))?;
            
            Ok(FontInfo {
                name: file_name.replace(".woff2", ""),
                filename: file_name,
                size: metadata.len(),
                path: dest_path.to_string_lossy().to_string(),
            })
        }
        "ttf" => {
            log::info!("[FontService] 开始转换 TTF 到 WOFF2: {}", file_name);
            
            let _ = app.emit("font-conversion-start", FontConversionStart {
                filename: file_name.clone(),
            });
            
            let start_time = std::time::Instant::now();
            
            let woff2_filename = file_name.replace(".ttf", ".woff2").replace(".TTF", ".woff2");
            let woff2_path = fonts_dir.join(&woff2_filename);
            
            let sidecar_command = app
                .shell()
                .sidecar("woff2_compress")
                .map_err(|e| format!("无法创建 sidecar 命令: {}", e))?
                .args([source_path.to_string_lossy().as_ref()]);
            
            log::info!("[FontService] 执行 woff2_compress 命令...");
            let output = sidecar_command
                .output()
                .await
                .map_err(|e| format!("执行 woff2_compress 失败: {}", e))?;
            
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let duration_secs = start_time.elapsed().as_secs_f64();
                log::error!("[FontService] woff2_compress 失败: {}", stderr);
                
                let _ = app.emit("font-conversion-complete", FontConversionComplete {
                    filename: woff2_filename.clone(),
                    success: false,
                    duration_secs,
                    error: Some(stderr.to_string()),
                });
                
                return Err(format!("woff2_compress 执行失败: {}", stderr));
            }
            
            let temp_woff2_path = source_path.with_extension("woff2");
            
            if temp_woff2_path.exists() {
                fs::rename(&temp_woff2_path, &woff2_path)
                    .map_err(|e| format!("移动 WOFF2 文件失败: {}", e))?;
            } else {
                log::error!("[FontService] woff2_compress 未生成输出文件");
                return Err("woff2_compress 未生成输出文件".to_string());
            }
            
            let metadata = fs::metadata(&woff2_path)
                .map_err(|e| format!("读取文件信息失败: {}", e))?;
            
            let duration = start_time.elapsed();
            let duration_secs = duration.as_secs_f64();
            
            log::info!(
                "[FontService] 转换完成: {} -> {} (耗时: {:.2}秒, 原大小: {}字节, 压缩后: {}字节, 压缩率: {:.1}%)",
                file_name,
                woff2_filename,
                duration_secs,
                fs::metadata(&source_path).map(|m| m.len()).unwrap_or(0),
                metadata.len(),
                (1.0 - (metadata.len() as f64 / fs::metadata(&source_path).map(|m| m.len()).unwrap_or(1) as f64)) * 100.0
            );
            
            let _ = app.emit("font-conversion-complete", FontConversionComplete {
                filename: woff2_filename.clone(),
                success: true,
                duration_secs,
                error: None,
            });
            
            Ok(FontInfo {
                name: woff2_filename.replace(".woff2", ""),
                filename: woff2_filename,
                size: metadata.len(),
                path: woff2_path.to_string_lossy().to_string(),
            })
        }
        _ => Err(format!("不支持的文件格式: {}", file_ext)),
    }
}

#[tauri::command]
pub async fn upload_font_data(
    app: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<FontInfo, String> {
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&filename);
    
    fs::write(&temp_path, &data)
        .map_err(|e| format!("保存临时文件失败: {}", e))?;
    
    let result = upload_and_convert_font(app, temp_path.to_string_lossy().to_string()).await?;
    
    let _ = fs::remove_file(&temp_path);
    
    Ok(result)
}

fn map_font_source(source: &fontdb::Source) -> Option<String> {
    #[allow(unreachable_patterns)]
    match source {
        fontdb::Source::File(path) => Some(path.to_string_lossy().to_string()),
        fontdb::Source::SharedFile(path, _) => Some(path.to_string_lossy().to_string()),
        _ => None,
    }
}

#[tauri::command]
pub async fn list_system_fonts() -> Result<Vec<SystemFontInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut db = fontdb::Database::new();
        db.load_system_fonts();

        let mut families: BTreeMap<String, SystemFontInfo> = BTreeMap::new();

        for face in db.faces() {
            let is_monospace = face.monospaced;
            let source_path = map_font_source(&face.source);

            for (name, _) in &face.families {
                let entry = families.entry(name.to_string()).or_insert_with(|| SystemFontInfo {
                    family: name.to_string(),
                    is_monospace,
                    sources: Vec::new(),
                });

                if is_monospace {
                    entry.is_monospace = true;
                }

                if let Some(path) = &source_path {
                    if !entry.sources.contains(path) {
                        entry.sources.push(path.clone());
                    }
                }
            }
        }

        let mut fonts: Vec<SystemFontInfo> = families.into_values().collect();
        fonts.sort_by(|a, b| a.family.to_lowercase().cmp(&b.family.to_lowercase()));

        Ok(fonts)
    })
    .await
    .map_err(|e| format!("获取系统字体失败: {e}"))?
}
