/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* RAG 知识库 Model 层：wang_kb_docs / wang_kb_chunks */
import { wang_db } from '../db/wang_db.js';

export function wang_addDoc(wang_filename, wang_filetype, wang_filesize, wang_status) {
    const wang_info = wang_db.prepare('INSERT INTO wang_kb_docs (wang_filename, wang_filetype, wang_filesize, wang_status) VALUES (?, ?, ?, ?)')
        .run(wang_filename, wang_filetype, wang_filesize, wang_status);
    return Number(wang_info.lastInsertRowid);
}

export function wang_addChunk(wang_docId, wang_seq, wang_content) {
    wang_db.prepare('INSERT INTO wang_kb_chunks (wang_doc_id, wang_seq, wang_content) VALUES (?, ?, ?)').run(wang_docId, wang_seq, wang_content);
}

export function wang_setDocChunks(wang_docId, wang_chunks) {
    wang_db.prepare('UPDATE wang_kb_docs SET wang_chunks = ? WHERE wang_id = ?').run(wang_chunks, wang_docId);
}

export function wang_listDocs() {
    return wang_db.prepare('SELECT * FROM wang_kb_docs ORDER BY wang_id DESC').all();
}

export function wang_deleteDoc(wang_id) {
    const wang_info = wang_db.prepare('DELETE FROM wang_kb_docs WHERE wang_id = ?').run(wang_id);
    return wang_info.changes > 0;
}

export function wang_allChunks() {
    return wang_db.prepare('SELECT c.wang_id, c.wang_doc_id, c.wang_seq, c.wang_content, d.wang_filename FROM wang_kb_chunks c JOIN wang_kb_docs d ON d.wang_id = c.wang_doc_id ORDER BY c.wang_doc_id, c.wang_seq').all();
}
