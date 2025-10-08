use anyhow::{Context, Result};
use rusqlite::params;

use crate::database::{DatabaseConnection};
use crate::models::{SearchResult};

/// 数据库搜索管理器
pub struct DatabaseSearch<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> DatabaseSearch<'a> {
    /// 创建新的数据库搜索管理器
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// 执行向量相似性搜索
    pub fn vector_search(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
        if self.db.supports_vector_search() {
            self.vector_search_with_sqlite_vec(query_embedding, limit)
        } else {
            self.vector_search_fallback(query_embedding, limit)
        }
    }

    // 移除了未使用的hybrid_search方法，功能已在VectorDatabase中实现

    // 移除了未使用的bm25_search, smart_search, search_with_config方法

    /// 使用 sqlite-vec 执行向量搜索
    fn vector_search_with_sqlite_vec(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
        // 将查询向量转换为字节格式，按照示例代码的方式
        let query_bytes: Vec<u8> = query_embedding
            .iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();

        let mut stmt = self.db.connection().prepare(
            r#"
            SELECT
                dc.id,
                dc.book_title,
                dc.book_author,
                dc.md_file_path,
                dc.file_order_in_book,
                dc.related_chapter_titles,
                dc.chunk_text,
                dc.chunk_order_in_file,
                dc.total_chunks_in_file,
                dc.global_chunk_index,
                dc.created_at,
                distance
            FROM document_chunks dc
            JOIN chunk_embeddings ce ON dc.id = ce.chunk_id
            WHERE ce.embedding MATCH ?1 AND k = ?2
            ORDER BY distance ASC
            "#
        )?;

        let rows = stmt.query_map(params![query_bytes, limit], |row| {
            Ok(SearchResult {
                chunk_id: row.get(0)?,
                book_title: row.get(1)?,
                book_author: row.get(2)?,
                md_file_path: row.get(3)?,
                file_order_in_book: row.get(4)?,
                related_chapter_titles: row.get(5)?,
                chunk_text: row.get(6)?,
                chunk_order_in_file: row.get(7)?,
                total_chunks_in_file: row.get(8)?,
                global_chunk_index: row.get(9)?,
                similarity_score: (1.0 - row.get::<_, f64>(11)?) as f32, // 转换距离为相似度
            })
        })?;

        let results: Result<Vec<_>, _> = rows.collect();
        results.context("Failed to collect search results")
    }

    /// 后备向量搜索实现（使用余弦相似度计算）
    fn vector_search_fallback(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<SearchResult>> {
        // 获取所有嵌入向量
        let mut stmt = self.db.connection().prepare(
            r#"
            SELECT 
                dc.id,
                dc.book_title,
                dc.book_author,
                dc.md_file_path,
                dc.file_order_in_book,
                dc.related_chapter_titles,
                dc.chunk_text,
                dc.chunk_order_in_file,
                dc.total_chunks_in_file,
                dc.global_chunk_index,
                dc.created_at,
                cef.embedding
            FROM document_chunks dc
            JOIN chunk_embeddings_fallback cef ON dc.id = cef.chunk_id
            "#
        )?;

        let rows = stmt.query_map([], |row| {
            let embedding_bytes: Vec<u8> = row.get(11)?;
            let embedding = self.bytes_to_f32_vec(&embedding_bytes)?;
            
            let similarity = self.cosine_similarity(query_embedding, &embedding);
            
            Ok(SearchResult {
                chunk_id: row.get(0)?,
                book_title: row.get(1)?,
                book_author: row.get(2)?,
                md_file_path: row.get(3)?,
                file_order_in_book: row.get(4)?,
                related_chapter_titles: row.get(5)?,
                chunk_text: row.get(6)?,
                chunk_order_in_file: row.get(7)?,
                total_chunks_in_file: row.get(8)?,
                global_chunk_index: row.get(9)?,
                similarity_score: similarity as f32,
            })
        })?;

        let mut results: Vec<SearchResult> = rows.collect::<Result<Vec<_>, _>>()?;
        
        // 按相似度排序并限制结果数量
        results.sort_by(|a, b| b.similarity_score.partial_cmp(&a.similarity_score).unwrap());
        results.truncate(limit);
        
        Ok(results)
    }

    /// 执行文本搜索
    pub fn text_search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let search_pattern = format!("%{}%", query);
        
        let mut stmt = self.db.connection().prepare(
            r#"
            SELECT 
                id, book_title, book_author, md_file_path, file_order_in_book,
                related_chapter_titles, chunk_text, chunk_order_in_file,
                total_chunks_in_file, global_chunk_index, created_at
            FROM document_chunks 
            WHERE chunk_text LIKE ?1 
               OR related_chapter_titles LIKE ?1
               OR book_title LIKE ?1
            ORDER BY 
                CASE 
                    WHEN book_title LIKE ?1 THEN 1
                    WHEN related_chapter_titles LIKE ?1 THEN 2
                    ELSE 3
                END,
                file_order_in_book,
                chunk_order_in_file
            LIMIT ?2
            "#
        )?;

        let rows = stmt.query_map(params![search_pattern, limit], |row| {
            Ok(SearchResult {
                chunk_id: row.get(0)?,
                book_title: row.get(1)?,
                book_author: row.get(2)?,
                md_file_path: row.get(3)?,
                file_order_in_book: row.get(4)?,
                related_chapter_titles: row.get(5)?,
                chunk_text: row.get(6)?,
                chunk_order_in_file: row.get(7)?,
                total_chunks_in_file: row.get(8)?,
                global_chunk_index: row.get(9)?,
                similarity_score: 1.0, // 文本搜索不计算相似度分数
            })
        })?;

        let results: Result<Vec<_>, _> = rows.collect();
        results.context("Failed to collect text search results")
    }

    /// 将字节数组转换为 f32 向量
    fn bytes_to_f32_vec(&self, bytes: &[u8]) -> Result<Vec<f32>, rusqlite::Error> {
        if bytes.len() % 4 != 0 {
            return Err(rusqlite::Error::InvalidColumnType(
                0,
                "Invalid embedding byte length".to_string(),
                rusqlite::types::Type::Blob
            ));
        }
        
        let mut vec = Vec::with_capacity(bytes.len() / 4);
        for chunk in bytes.chunks_exact(4) {
            let float_bytes = [chunk[0], chunk[1], chunk[2], chunk[3]];
            vec.push(f32::from_le_bytes(float_bytes));
        }
        
        Ok(vec)
    }

    /// 计算余弦相似度
    fn cosine_similarity(&self, a: &[f32], b: &[f32]) -> f64 {
        if a.len() != b.len() {
            return 0.0;
        }
        
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        
        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }
        
        (dot_product / (norm_a * norm_b)) as f64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{DatabaseConnection, DatabaseOperations};
    use tempfile::NamedTempFile;

    fn create_test_db_with_data() -> (DatabaseConnection, i64) {
        let temp_file = NamedTempFile::new().unwrap();
        let mut db = DatabaseConnection::new(temp_file.path(), 384).unwrap();
        
        let chunk = crate::models::DocumentChunk {
            id: None,
            book_title: "Test Book".to_string(),
            book_author: "Test Author".to_string(),
            md_file_path: "test.md".to_string(),
            file_order_in_book: 1,
            related_chapter_titles: "Chapter 1".to_string(),
            chunk_text: "This is a test chunk about artificial intelligence.".to_string(),
            chunk_order_in_file: 0,
            total_chunks_in_file: 1,
            global_chunk_index: 0,
            created_at: "2023-01-01 00:00:00".to_string(),
        };
        
        let mut ops = DatabaseOperations::new(&mut db);
        let chunk_id = ops.insert_chunk(&chunk).unwrap();
        
        (db, chunk_id)
    }

    #[test]
    fn test_text_search() {
        let (db, _) = create_test_db_with_data();
        let search = DatabaseSearch::new(&db);
        
        let results = search.text_search("artificial intelligence", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].chunk.chunk_text.contains("artificial intelligence"));
    }

    #[test]
    fn test_cosine_similarity() {
        let temp_file = NamedTempFile::new().unwrap();
        let db = DatabaseConnection::new(temp_file.path(), 384).unwrap();
        let search = DatabaseSearch::new(&db);
        
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![1.0, 0.0, 0.0];
        let similarity = search.cosine_similarity(&vec1, &vec2);
        assert!((similarity - 1.0).abs() < 1e-6);
        
        let vec3 = vec![0.0, 1.0, 0.0];
        let similarity2 = search.cosine_similarity(&vec1, &vec3);
        assert!((similarity2 - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_bytes_to_f32_vec() {
        let temp_file = NamedTempFile::new().unwrap();
        let db = DatabaseConnection::new(temp_file.path(), 384).unwrap();
        let search = DatabaseSearch::new(&db);
        
        let original = vec![1.0f32, 2.0f32, 3.0f32];
        let bytes: Vec<u8> = original.iter().flat_map(|f| f.to_le_bytes()).collect();
        let recovered = search.bytes_to_f32_vec(&bytes).unwrap();
        
        assert_eq!(original, recovered);
    }
}
