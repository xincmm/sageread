use anyhow::Result;
use rusqlite::params;

use crate::database::DatabaseConnection;
use crate::models::DocumentChunk;

/// 数据库操作管理器
pub struct DatabaseOperations<'a> {
    db: &'a mut DatabaseConnection,
}

impl<'a> DatabaseOperations<'a> {
    /// 创建新的数据库操作管理器
    pub fn new(db: &'a mut DatabaseConnection) -> Self {
        Self { db }
    }

    /// 插入单个文档块
    pub fn insert_chunk(&mut self, chunk: &DocumentChunk) -> Result<i64> {
        // 插入文档分块元数据
        let chunk_id = self.db.connection_mut().query_row(
            r#"
            INSERT INTO document_chunks (
                book_title, book_author, md_file_path, file_order_in_book,
                related_chapter_titles, chunk_text, chunk_order_in_file,
                total_chunks_in_file, global_chunk_index
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            RETURNING id
            "#,
            params![
                chunk.book_title,
                chunk.book_author,
                chunk.md_file_path,
                chunk.file_order_in_book,
                chunk.related_chapter_titles,
                chunk.chunk_text,
                chunk.chunk_order_in_file,
                chunk.total_chunks_in_file,
                chunk.global_chunk_index,
            ],
            |row| row.get(0),
        )?;

        // 插入向量数据
        self.insert_embedding(chunk_id, &chunk.embedding)?;

        Ok(chunk_id)
    }

    /// 插入向量数据到相应的表中
    fn insert_embedding(&mut self, chunk_id: i64, embedding: &[f32]) -> Result<()> {
        if self.db.supports_vector_search() {
            // 使用 sqlite-vec 虚拟表，按照示例代码的方式转换为字节
            let embedding_bytes: Vec<u8> = embedding
                .iter()
                .flat_map(|f| f.to_le_bytes())
                .collect();

            self.db.connection_mut().execute(
                "INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (?1, ?2)",
                params![chunk_id, embedding_bytes],
            )?;
        } else {
            // 使用后备表存储向量为 BLOB
            let embedding_bytes: Vec<u8> = embedding
                .iter()
                .flat_map(|f| f.to_le_bytes())
                .collect();

            self.db.connection_mut().execute(
                "INSERT INTO chunk_embeddings_fallback (chunk_id, embedding) VALUES (?1, ?2)",
                params![chunk_id, embedding_bytes],
            )?;
        }

        Ok(())
    }

    /// 批量插入文档块
    pub fn insert_chunks_batch(&mut self, chunks: &[DocumentChunk]) -> Result<Vec<i64>> {
        if chunks.is_empty() {
            return Ok(vec![]);
        }

        self.db.begin_transaction()?;
        
        let result = self.insert_chunks_batch_inner(chunks);
        
        match result {
            Ok(ids) => {
                self.db.commit_transaction()?;
                Ok(ids)
            }
            Err(e) => {
                self.db.rollback_transaction()?;
                Err(e)
            }
        }
    }

    fn insert_chunks_batch_inner(&mut self, chunks: &[DocumentChunk]) -> Result<Vec<i64>> {
        let mut chunk_ids = Vec::new();
        
        for chunk in chunks {
            let chunk_id = self.insert_chunk(chunk)?;
            chunk_ids.push(chunk_id);
        }
        
        Ok(chunk_ids)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::DatabaseConnection;
    use tempfile::NamedTempFile;

    fn create_test_db() -> DatabaseConnection {
        let temp_file = NamedTempFile::new().unwrap();
        DatabaseConnection::new(temp_file.path(), 384).unwrap()
    }

    fn create_test_chunk() -> DocumentChunk {
        DocumentChunk {
            id: None,
            book_title: "Test Book".to_string(),
            book_author: "Test Author".to_string(),
            md_file_path: "test.md".to_string(),
            file_order_in_book: 1,
            related_chapter_titles: "Chapter 1".to_string(),
            chunk_text: "This is a test chunk.".to_string(),
            chunk_order_in_file: 0,
            total_chunks_in_file: 1,
            global_chunk_index: 0,
            created_at: "2023-01-01 00:00:00".to_string(),
        }
    }

    #[test]
    fn test_insert_and_retrieve_chunk() {
        let mut db = create_test_db();
        let mut ops = DatabaseOperations::new(&mut db);
        
        let chunk = create_test_chunk();
        let chunk_id = ops.insert_chunk(&chunk).unwrap();
        assert!(chunk_id > 0);

        let chunks = ops.get_book_chunks("Test Book", "Test Author").unwrap();
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].chunk_text, "This is a test chunk.");
    }

    #[test]
    fn test_book_exists() {
        let mut db = create_test_db();
        let mut ops = DatabaseOperations::new(&mut db);
        
        assert!(!ops.book_exists("Test Book", "Test Author").unwrap());
        
        let chunk = create_test_chunk();
        ops.insert_chunk(&chunk).unwrap();
        
        assert!(ops.book_exists("Test Book", "Test Author").unwrap());
    }

    #[test]
    fn test_delete_book() {
        let mut db = create_test_db();
        let mut ops = DatabaseOperations::new(&mut db);
        
        let chunk = create_test_chunk();
        ops.insert_chunk(&chunk).unwrap();
        
        assert!(ops.book_exists("Test Book", "Test Author").unwrap());
        
        let deleted_count = ops.delete_book("Test Book", "Test Author").unwrap();
        assert_eq!(deleted_count, 1);
        
        assert!(!ops.book_exists("Test Book", "Test Author").unwrap());
    }
}
