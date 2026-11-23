// 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// 数据库连接模块：SQLite（node:sqlite 内置驱动），首次运行自动执行建表脚本
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const wang_dir = path.dirname(fileURLToPath(import.meta.url));
const wang_dbPath = path.join(wang_dir, process.env.DB_NAME || 'wang_ai_chat.db');
const wang_schemaPath = path.join(wang_dir, 'wang_schema.sql');
const wang_migratePath = path.join(wang_dir, 'wang_migrate.sql');
const wang_kb_migratePath = path.join(wang_dir, 'wang_kb_migrate.sql');

export const wang_db = new DatabaseSync(wang_dbPath);
wang_db.exec('PRAGMA foreign_keys = ON;');

function wang_tableExists(wang_name) {
    return wang_db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name=?").get(wang_name).c > 0;
}

// 全新数据库：执行完整建表脚本；已有数据库：执行增量迁移
if (!wang_tableExists('wang_users')) {
    wang_db.exec(fs.readFileSync(wang_schemaPath, 'utf-8'));
    console.log('[wang_db] 数据库初始化完成：', wang_dbPath);
} else {
    const wang_cols = wang_db.prepare('PRAGMA table_info(wang_sessions)').all().map(c => c.name);
    if (!wang_cols.includes('wang_summary')) {
        wang_db.exec("ALTER TABLE wang_sessions ADD COLUMN wang_summary TEXT DEFAULT ''");
        console.log('[wang_db] 迁移：wang_sessions 新增 wang_summary 列');
    }
    if (!wang_cols.includes('wang_compressed_id')) {
        wang_db.exec('ALTER TABLE wang_sessions ADD COLUMN wang_compressed_id INTEGER DEFAULT 0');
        console.log('[wang_db] 迁移：wang_sessions 新增 wang_compressed_id 列');
    }
    if (!wang_tableExists('wang_news') || !wang_tableExists('wang_gallery')) {
        wang_db.exec(fs.readFileSync(wang_migratePath, 'utf-8'));
        console.log('[wang_db] 迁移：wang_news / wang_gallery 建表并写入测试数据');
    }
    if (!wang_tableExists('wang_kb_docs')) {
        wang_db.exec(fs.readFileSync(wang_kb_migratePath, 'utf-8'));
        console.log('[wang_db] 迁移：wang_kb_docs / wang_kb_chunks 建表');
    }
}
