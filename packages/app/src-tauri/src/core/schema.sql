CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT,
    metadata TEXT NOT NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    format TEXT NOT NULL,
    file_path TEXT NOT NULL,
    cover_path TEXT,
    
    file_size INTEGER NOT NULL,
    language TEXT NOT NULL,
    
    tags TEXT,
    
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS book_status (
    book_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',  -- 'unread', 'reading', 'completed'
    progress_current INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    location TEXT,                           -- CFI 位置信息
    last_read_at INTEGER,
    started_at INTEGER,
    completed_at INTEGER,
    metadata TEXT,                 -- JSON 存储其他信息（设置、偏好等）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 阅读会话表 - 记录每次详细的阅读会话
CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,            -- 开始阅读时间戳
    ended_at INTEGER,                       -- 结束阅读时间戳（null表示未结束）
    duration_seconds INTEGER DEFAULT 0,     -- 实际阅读时长（秒）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);



CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_status_status ON book_status(status);
CREATE INDEX IF NOT EXISTS idx_book_status_progress ON book_status(progress_current, progress_total);
CREATE INDEX IF NOT EXISTS idx_book_status_location ON book_status(location);
CREATE INDEX IF NOT EXISTS idx_book_status_last_read ON book_status(last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_status_updated_at ON book_status(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_threads_book_id ON threads(book_id);

-- reading_sessions 表的索引
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_started_at ON reading_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_date ON reading_sessions(DATE(started_at/1000, 'unixepoch'));
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_date ON reading_sessions(book_id, DATE(started_at/1000, 'unixepoch'));

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_updated_at ON tags(updated_at DESC);

-- 笔记表
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT,                           -- 可选关联的书籍ID
    book_meta TEXT,                         -- JSON 存储书籍信息（title, author）
    title TEXT,                             -- 笔记标题（可选）
    content TEXT,                           -- 笔记内容（可选，支持markdown）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- notes 表的索引
CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- BookNote 表 - 存储书籍标注、书签、摘录等
CREATE TABLE IF NOT EXISTS book_notes (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL,
    type TEXT NOT NULL,                    -- 笔记类型: bookmark|annotation|excerpt
    cfi TEXT NOT NULL,                     -- 位置信息 (CFI格式)
    text TEXT,                             -- 选中的文本内容
    style TEXT,                            -- 高亮样式: highlight|underline|squiggly
    color TEXT,                            -- 颜色: red|yellow|green|blue|violet
    note TEXT NOT NULL,                    -- 用户笔记内容
    context_before TEXT,                   -- 前文上下文
    context_after TEXT,                    -- 后文上下文
    created_at INTEGER NOT NULL,           -- 创建时间戳
    updated_at INTEGER NOT NULL,           -- 更新时间戳
    
    -- 外键约束
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- book_notes 表的索引
CREATE INDEX IF NOT EXISTS idx_book_notes_book_id ON book_notes(book_id);
CREATE INDEX IF NOT EXISTS idx_book_notes_type ON book_notes(type);
CREATE INDEX IF NOT EXISTS idx_book_notes_created_at ON book_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_notes_cfi ON book_notes(cfi);

-- 技能库表 - 存储 AI 技能的标准操作流程
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,             -- 技能名称（如：生成思维导图）
    content TEXT NOT NULL,                 -- 技能内容（Markdown 格式的完整说明）
    is_active INTEGER DEFAULT 1,           -- 是否启用（1=启用，0=禁用）
    is_system INTEGER DEFAULT 0,           -- 是否为系统技能（1=系统，0=用户，系统技能不可删除）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- skills 表的索引
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_is_active ON skills(is_active);
CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills(updated_at DESC);