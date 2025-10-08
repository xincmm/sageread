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
    let mdbook_dir = mdbook_dir.as_ref();

    // 首先检查常见位置，支持 toc.ncx 和 book.ncx
    let candidate_names = ["toc.ncx", "book.ncx"];
    let common_dirs = [
        mdbook_dir.join("src"),
        mdbook_dir.to_path_buf(),
        mdbook_dir.join("book").join("src"),
        mdbook_dir.join("book"),
    ];

    for dir in &common_dirs {
        for name in &candidate_names {
            let location = dir.join(name);
            if location.exists() {
                log::info!("Found NCX file at common location: {:?}", location);
                return Some(location);
            }
        }
    }

    // 如果常见位置都没有，递归搜索整个目录
    log::info!("NCX file not found in common locations, searching recursively in: {:?}", mdbook_dir);
    find_ncx_recursive(mdbook_dir)
}

/// 递归搜索 .ncx 文件（支持 toc.ncx 和 book.ncx）
fn find_ncx_recursive<P: AsRef<Path>>(dir: P) -> Option<PathBuf> {
    let dir = dir.as_ref();

    // 检查当前目录下是否存在任意 .ncx 文件
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_file() {
                if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                    if ext.eq_ignore_ascii_case("ncx") {
                        log::info!("Found NCX file at: {:?}", path);
                        return Some(path);
                    }
                }
            } else if path.is_dir() {
                // 跳过一些不太可能包含 .ncx 的目录
                if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
                    if dir_name.starts_with('.') || dir_name == "target" || dir_name == "node_modules" {
                        continue;
                    }
                }

                if let Some(found) = find_ncx_recursive(&path) {
                    return Some(found);
                }
            }
        }
    }

    None
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



#[cfg(test)]
mod tests {
    use super::*;



    #[test]
    fn test_flatten_toc() {
        let toc_nodes = vec![
            TocNode {
                id: "chapter1".to_string(),
                play_order: 1,
                title: "Chapter 1".to_string(),
                src: "chapter1.xhtml".to_string(),
                children: vec![
                    TocNode {
                        id: "section1_1".to_string(),
                        play_order: 2,
                        title: "Section 1.1".to_string(),
                        src: "chapter1.xhtml#section1".to_string(),
                        children: vec![],
                    }
                ],
            }
        ];

        let flattened = flatten_toc(&toc_nodes);
        assert_eq!(flattened.len(), 2);
        assert_eq!(flattened[0].depth, 0);
        assert_eq!(flattened[0].md_src, "chapter1.md");
        assert_eq!(flattened[0].anchor, None);
        assert_eq!(flattened[0].hierarchy_path, vec!["Chapter 1"]);
        assert_eq!(flattened[1].depth, 1);
        assert_eq!(flattened[1].md_src, "chapter1.md");
        assert_eq!(flattened[1].anchor, Some("section1".to_string()));
        assert_eq!(flattened[1].hierarchy_path, vec!["Chapter 1", "Section 1.1"]);
    }
}
