// 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// Model 层：对用户 / 会话 / 消息三张表的数据访问
import { wang_db } from '../db/wang_db.js';

export function wang_listUsers() {
    return wang_db.prepare('SELECT * FROM wang_users ORDER BY wang_id').all();
}

export function wang_addUser(wang_name, wang_account) {
    const wang_info = wang_db.prepare('INSERT INTO wang_users (wang_name, wang_account) VALUES (?, ?)').run(wang_name, wang_account);
    return wang_info.lastInsertRowid;
}

export function wang_listSessions(wang_userId) {
    return wang_db.prepare(
        `SELECT s.*, COUNT(m.wang_id) AS wang_msg_count
         FROM wang_sessions s LEFT JOIN wang_messages m ON m.wang_session_id = s.wang_id
         WHERE s.wang_user_id = ? GROUP BY s.wang_id ORDER BY s.wang_id DESC`
    ).all(wang_userId);
}

export function wang_addSession(wang_userId, wang_title) {
    const wang_info = wang_db.prepare('INSERT INTO wang_sessions (wang_user_id, wang_title) VALUES (?, ?)').run(wang_userId, wang_title);
    return wang_info.lastInsertRowid;
}

export function wang_deleteSession(wang_id) {
    return wang_db.prepare('DELETE FROM wang_sessions WHERE wang_id = ?').run(wang_id).changes > 0;
}

export function wang_getSession(wang_id) {
    return wang_db.prepare('SELECT * FROM wang_sessions WHERE wang_id = ?').get(wang_id);
}

export function wang_listMessages(wang_sessionId) {
    return wang_db.prepare('SELECT * FROM wang_messages WHERE wang_session_id = ? ORDER BY wang_id').all(wang_sessionId);
}

export function wang_addMessage(wang_sessionId, wang_role, wang_content) {
    const wang_info = wang_db.prepare('INSERT INTO wang_messages (wang_session_id, wang_role, wang_content) VALUES (?, ?, ?)').run(wang_sessionId, wang_role, wang_content);
    return wang_info.lastInsertRowid;
}

/* 压缩水位线之后的消息（用于多轮上下文拼装） */
export function wang_listMessagesAfter(wang_sessionId, wang_afterId) {
    return wang_db.prepare('SELECT * FROM wang_messages WHERE wang_session_id = ? AND wang_id > ? ORDER BY wang_id').all(wang_sessionId, wang_afterId);
}

/* 写入会话压缩摘要与水位线 */
export function wang_setSummary(wang_sessionId, wang_summary, wang_compressed_id) {
    wang_db.prepare('UPDATE wang_sessions SET wang_summary = ?, wang_compressed_id = ? WHERE wang_id = ?')
        .run(wang_summary, wang_compressed_id, wang_sessionId);
}

/* 会话重命名 */
export function wang_renameSession(wang_id, wang_title) {
    return wang_db.prepare('UPDATE wang_sessions SET wang_title = ? WHERE wang_id = ?').run(wang_title, wang_id).changes > 0;
}

/* ---------- 科技新闻 ---------- */
export function wang_listNews() {
    return wang_db.prepare('SELECT * FROM wang_news ORDER BY wang_pub_date DESC, wang_id DESC').all();
}

/* ---------- 图文展示 ---------- */
export function wang_listGallery() {
    return wang_db.prepare('SELECT * FROM wang_gallery ORDER BY wang_id').all();
}
