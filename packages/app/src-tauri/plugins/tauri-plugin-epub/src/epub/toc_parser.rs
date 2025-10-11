use roxmltree::{Document, Node};
use std::path::{Path, PathBuf};
use regex::Regex;

use crate::models::{TocNode, FlatTocNode};

/// 解析 toc.ncx 文件，返回结构化的目录数据
pub fn parse_toc_file<P: AsRef<Path>>(toc_path: P) -> Result<Vec<TocNode>, String> {
    let toc_content = std::fs::read_to_string(toc_path).map_err(|e| e.to_string())?;
    parse_toc_content(&toc_content)
}

/// 解析 NCX 文件内容
pub fn parse_toc_content(content: &str) -> Result<Vec<TocNode>, String> {
    // roxmltree 不支持 DTD，某些 toc.ncx 带有 <!DOCTYPE ...>，需要在解析前移除
    let sanitized = strip_doctype(content);
    let doc = Document::parse(&sanitized).map_err(|e| format!("Failed to parse XML: {}", e))?;
    
    // 查找 navMap 元素
    let nav_map = doc
        .root_element()
        .children()
        .find(|node| node.tag_name().name() == "navMap")
        .ok_or("navMap element not found")?;
    
    // 解析所有顶层的 navPoint
    let nav_points: Vec<TocNode> = nav_map
        .children()
        .filter(|node| node.is_element() && node.tag_name().name() == "navPoint")
        .map(parse_nav_point)
        .collect::<Result<Vec<_>, _>>()?;
    
    Ok(nav_points)
}

/// 去除 XML 中的 DOCTYPE 声明（包含可能的内部子集），以便 roxmltree 能解析
fn strip_doctype(input: &str) -> String {
    // 简单且鲁棒：跨行匹配，移除从 <!DOCTYPE 到下一个 >
    // 该模式覆盖大部分 toc.ncx 的 DTD 写法（含内部子集 ]>）
    let re = Regex::new(r"(?is)<!DOCTYPE.*?>").unwrap();
    re.replace(input, "").to_string()
}

/// 递归解析 navPoint 节点
fn parse_nav_point(node: Node) -> Result<TocNode, String> {
    // 获取属性
    let id = node
        .attribute("id")
        .ok_or("navPoint missing id attribute")?
        .to_string();
    
    let play_order: u32 = node
        .attribute("playOrder")
        .ok_or("navPoint missing playOrder attribute")?
        .parse()
        .map_err(|_| "Invalid playOrder value")?;
    
    // 获取 navLabel 中的 text
    let title = node
        .children()
        .find(|child| child.tag_name().name() == "navLabel")
        .ok_or("navLabel not found")?
        .children()
        .find(|child| child.tag_name().name() == "text")
        .ok_or("text node not found in navLabel")?
        .text()
        .ok_or("text content not found")?
        .to_string();
    
    // 获取 content 的 src 属性
    let src = node
        .children()
        .find(|child| child.tag_name().name() == "content")
        .ok_or("content not found")?
        .attribute("src")
        .ok_or("src attribute not found")?
        .to_string();
    
    // 递归解析子节点
    let children: Vec<TocNode> = node
        .children()
        .filter(|child| child.is_element() && child.tag_name().name() == "navPoint")
        .map(parse_nav_point)
        .collect::<Result<Vec<_>, _>>()?;
    
    Ok(TocNode {
        id,
        play_order,
        title,
        src,
        children,
    })
}



/// 在 mdbook 目录中查找 toc.ncx 文件
pub fn find_toc_ncx_in_mdbook<P: AsRef<Path>>(mdbook_dir: P) -> Option<PathBuf> {
    log::info!("Searching for NCX file in: {:?}", mdbook_dir.as_ref());
    find_ncx_recursive(mdbook_dir)
}

/// 通用的递归文件查找函数
/// 
/// # Arguments
/// * `dir` - 搜索的目录
/// * `predicate` - 判断文件是否匹配的函数，接受文件路径，返回是否匹配
fn find_file_recursive<P, F>(dir: P, predicate: F) -> Option<PathBuf>
where
    P: AsRef<Path>,
    F: Fn(&Path) -> bool + Copy,
{
    let dir = dir.as_ref();

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                if predicate(&path) {
                    log::info!("Found matching file at: {:?}", path);
                    return Some(path);
                }
            } else if path.is_dir() {
                // 跳过一些不太可能包含目标文件的目录
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    if dir_name.starts_with('.') || dir_name == "target" || dir_name == "node_modules" {
                        continue;
                    }
                }

                if let Some(found) = find_file_recursive(&path, predicate) {
                    return Some(found);
                }
            }
        }
    }

    None
}

/// 递归搜索 .ncx 文件（支持 toc.ncx 和 book.ncx）
fn find_ncx_recursive<P: AsRef<Path>>(dir: P) -> Option<PathBuf> {
    find_file_recursive(dir, |path| {
        path.extension()
            .and_then(|s| s.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("ncx"))
            .unwrap_or(false)
    })
}

/// 将嵌套的 TOC 结构扁平化，保留层级信息
pub fn flatten_toc(toc_nodes: &[TocNode]) -> Vec<FlatTocNode> {
    let mut result = Vec::new();

    fn flatten_recursive(nodes: &[TocNode], depth: u32, parent_path: &[String], result: &mut Vec<FlatTocNode>) {
        for node in nodes {
            // 处理 src，分离文件路径和锚点
            let (md_src, anchor) = if let Some(hash_pos) = node.src.find('#') {
                let (file_part, anchor_part) = node.src.split_at(hash_pos);
                (file_part.to_string(), Some(anchor_part[1..].to_string()))
            } else {
                (node.src.clone(), None)
            };

            // 将 .xhtml 或 .html 扩展名替换为 .md
            let md_src = if md_src.ends_with(".xhtml") {
                md_src.replace(".xhtml", ".md")
            } else if md_src.ends_with(".html") {
                md_src.replace(".html", ".md")
            } else {
                md_src
            };

            // 构建当前节点的完整层级路径
            let mut current_path = parent_path.to_vec();
            current_path.push(node.title.clone());

            result.push(FlatTocNode {
                id: node.id.clone(),
                play_order: node.play_order,
                title: node.title.clone(),
                md_src,
                depth,
                anchor,
                hierarchy_path: current_path.clone(),
            });

            // 递归处理子节点，传递当前路径
            flatten_recursive(&node.children, depth + 1, &current_path, result);
        }
    }

    flatten_recursive(toc_nodes, 0, &[], &mut result);
    result
}

/// 在 mdbook 目录中查找 nav.md 文件
pub fn find_nav_md_in_mdbook<P: AsRef<Path>>(mdbook_dir: P) -> Option<PathBuf> {
    log::info!("Searching for nav.md in: {:?}", mdbook_dir.as_ref());
    find_nav_md_recursive(mdbook_dir)
}

/// 递归搜索 nav.md 文件
fn find_nav_md_recursive<P: AsRef<Path>>(dir: P) -> Option<PathBuf> {
    find_file_recursive(dir, |path| {
        path.file_name()
            .and_then(|n| n.to_str())
            .map(|name| name.eq_ignore_ascii_case("nav.md"))
            .unwrap_or(false)
    })
}

/// 解析 nav.md 文件，返回结构化的目录数据
pub fn parse_nav_md_file<P: AsRef<Path>>(nav_path: P) -> Result<Vec<TocNode>, String> {
    let nav_content = std::fs::read_to_string(nav_path).map_err(|e| e.to_string())?;
    parse_nav_md_content(&nav_content)
}

/// 解析 nav.md 文件内容
pub fn parse_nav_md_content(content: &str) -> Result<Vec<TocNode>, String> {
    // 正则匹配：前导空格 + 数字 + 点 + 空格 + Markdown链接
    // 例如："    1.  [标题](路径#锚点)"
    let re = Regex::new(r"^(\s*)(\d+)\.\s+\[([^\]]+)\]\(([^)]+)\)")
        .map_err(|e| format!("Failed to compile regex: {}", e))?;
    
    let mut play_order = 1u32;
    
    // 临时存储所有节点（包括嵌套），稍后重建树形结构
    let mut flat_items: Vec<(u32, TocNode)> = Vec::new();
    
    for line in content.lines() {
        if let Some(caps) = re.captures(line) {
            let leading_spaces = &caps[1];
            let title = caps[3].trim().to_string();
            let href = caps[4].trim().to_string();
            
            // 计算深度：4个空格 = 1级
            let depth = (leading_spaces.len() / 4) as u32;
            
            // 创建新节点
            let node = TocNode {
                id: format!("nav_{}", play_order),
                play_order,
                title,
                src: href,
                children: Vec::new(),
            };
            
            flat_items.push((depth, node));
            play_order += 1;
        }
    }
    
    // 重建树形结构
    build_tree_from_flat(&flat_items)
}

/// 从扁平列表构建树形结构
fn build_tree_from_flat(items: &[(u32, TocNode)]) -> Result<Vec<TocNode>, String> {
    if items.is_empty() {
        return Ok(Vec::new());
    }
    
    let mut root_nodes: Vec<TocNode> = Vec::new();
    // 记录每个深度最后一个节点在树中的路径
    let mut depth_paths: Vec<Vec<usize>> = Vec::new();
    
    for (depth, node) in items {
        let depth = *depth;
        
        if depth == 0 {
            // 顶层节点
            root_nodes.push(node.clone());
            
            // 更新路径：深度0的路径就是它在root_nodes中的索引
            if depth_paths.is_empty() {
                depth_paths.push(vec![root_nodes.len() - 1]);
            } else {
                depth_paths[0] = vec![root_nodes.len() - 1];
            }
        } else {
            // 子节点：需要找到父节点
            let depth_usize = depth as usize;
            
            // 确保父节点存在
            if depth_usize == 0 || depth_paths.len() < depth_usize {
                return Err(format!("Invalid nesting: depth {} but no parent", depth));
            }
            
            // 获取父节点的路径（深度 depth-1）并克隆以避免借用冲突
            let parent_path = depth_paths[depth_usize - 1].clone();
            
            // 通过路径找到父节点并添加子节点
            let mut current = &mut root_nodes;
            for (i, idx) in parent_path.iter().enumerate() {
                if i < parent_path.len() - 1 {
                    current = &mut current[*idx].children;
                } else {
                    // 最后一个索引：这是父节点
                    current[*idx].children.push(node.clone());
                    
                    // 更新当前深度的路径
                    let mut new_path = parent_path.clone();
                    new_path.push(current[*idx].children.len() - 1);
                    
                    if depth_paths.len() <= depth_usize {
                        depth_paths.push(new_path);
                    } else {
                        depth_paths[depth_usize] = new_path;
                    }
                }
            }
        }
    }
    
    Ok(root_nodes)
}
