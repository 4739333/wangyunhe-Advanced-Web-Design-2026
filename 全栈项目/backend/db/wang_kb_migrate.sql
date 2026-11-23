-- 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
-- RAG 知识库增量迁移：为已有数据库补建 wang_kb_docs / wang_kb_chunks

CREATE TABLE IF NOT EXISTS wang_kb_docs (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_filename    TEXT NOT NULL,
    wang_filetype    TEXT NOT NULL,
    wang_filesize    INTEGER NOT NULL,
    wang_chunks      INTEGER NOT NULL DEFAULT 0,
    wang_status      TEXT NOT NULL DEFAULT 'ok',
    wang_created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS wang_kb_chunks (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_doc_id      INTEGER NOT NULL REFERENCES wang_kb_docs(wang_id) ON DELETE CASCADE,
    wang_seq         INTEGER NOT NULL,
    wang_content     TEXT NOT NULL
);
