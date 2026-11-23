/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* RAG 知识库控制器：
   - 文件上传解析：docx（原生 zip+inflate 解析）、doc（二进制启发式提取）、txt（UTF-8/GBK 自适应）
   - 知识库管理：列表 / 删除
   - 检索：中文二元组 + 英文分词的 TF 打分（无第三方库、无向量服务）
   - 问答：POST /api/kb/chat/stream，检索资料注入提示词后 SSE 流式转发大模型 */
import zlib from 'node:zlib';
import * as wang_kb from '../models/wang_kbModel.js';
import { wang_llmFetch, wang_llmModel } from './wang_aiController.js';

function wang_res(code, msg, data) {
    return { code, msg, data };
}

/* ================= 文件解析（原生实现） ================= */

/* 从 zip 缓冲区中按中央目录定位并解压指定条目 */
function wang_zipEntry(wang_buf, wang_name) {
    let wang_eocd = -1;
    for (let i = wang_buf.length - 22; i >= 0 && i > wang_buf.length - 66000; i--) {
        if (wang_buf.readUInt32LE(i) === 0x06054b50) { wang_eocd = i; break; }
    }
    if (wang_eocd < 0) throw new Error('不是有效的 docx（未找到 zip 目录）');
    const wang_count = wang_buf.readUInt16LE(wang_eocd + 10);
    let wang_off = wang_buf.readUInt32LE(wang_eocd + 16);
    for (let n = 0; n < wang_count; n++) {
        if (wang_buf.readUInt32LE(wang_off) !== 0x02014b50) throw new Error('zip 中央目录损坏');
        const wang_method = wang_buf.readUInt16LE(wang_off + 10);
        const wang_csize = wang_buf.readUInt32LE(wang_off + 20);
        const wang_fnLen = wang_buf.readUInt16LE(wang_off + 28);
        const wang_exLen = wang_buf.readUInt16LE(wang_off + 30);
        const wang_cmLen = wang_buf.readUInt16LE(wang_off + 32);
        const wang_lho = wang_buf.readUInt32LE(wang_off + 42);
        const wang_entry = wang_buf.toString('utf8', wang_off + 46, wang_off + 46 + wang_fnLen);
        if (wang_entry === wang_name) {
            const wang_lfn = wang_buf.readUInt16LE(wang_lho + 26);
            const wang_lex = wang_buf.readUInt16LE(wang_lho + 28);
            const wang_start = wang_lho + 30 + wang_lfn + wang_lex;
            const wang_raw = wang_buf.subarray(wang_start, wang_start + wang_csize);
            return wang_method === 0 ? wang_raw : zlib.inflateRawSync(wang_raw);
        }
        wang_off += 46 + wang_fnLen + wang_exLen + wang_cmLen;
    }
    throw new Error('docx 缺少 ' + wang_name);
}

function wang_xmlDecode(wang_s) {
    return wang_s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
}

/* docx：解出 word/document.xml，按段落收集 <w:t> 文本 */
function wang_parseDocx(wang_buf) {
    const wang_xml = wang_zipEntry(wang_buf, 'word/document.xml').toString('utf8');
    const wang_paras = [];
    for (const wang_seg of wang_xml.split(/<w:p\b/).slice(1)) {
        const wang_text = [...wang_seg.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
            .map(m => wang_xmlDecode(m[1])).join('').trim();
        if (wang_text) wang_paras.push(wang_text);
    }
    return wang_paras.join('\n');
}

/* doc（Word 97-2003 二进制 OLE）：启发式提取连续 UTF-16LE 文本段（课程演示级方案） */
function wang_parseDoc(wang_buf) {
    const wang_punct = '，。：；？！、（）《》“”‘’—…';
    const wang_out = [];
    let wang_cur = '';
    for (let i = 0; i + 1 < wang_buf.length; i += 2) {
        const wang_c = wang_buf.readUInt16LE(i);
        const wang_ch = String.fromCharCode(wang_c);
        const wang_ok = (wang_c >= 0x4e00 && wang_c <= 0x9fff) || (wang_c >= 0x20 && wang_c <= 0x7e) || wang_punct.includes(wang_ch);
        if (wang_ok) wang_cur += wang_ch;
        else {
            const wang_t = wang_cur.trim();
            if (wang_t.length >= 8 && /[\u4e00-\u9fff]/.test(wang_t)) wang_out.push(wang_t);
            wang_cur = '';
        }
    }
    return wang_out.join('\n');
}

/* txt：UTF-8 优先，出现乱码则按 GBK 重解 */
function wang_parseTxt(wang_buf) {
    let wang_text = new TextDecoder('utf-8').decode(wang_buf);
    if ((wang_text.match(/\uFFFD/g) || []).length > 2) wang_text = new TextDecoder('gbk').decode(wang_buf);
    return wang_text.replace(/\r\n/g, '\n');
}

/* ================= 分块与检索 ================= */

/* 段落聚合分块，目标约 380 字/块，超长段落按句边界硬切 */
function wang_chunkText(wang_text, wang_size = 380) {
    const wang_paras = String(wang_text).split(/\n+/).map(s => s.trim()).filter(Boolean);
    const wang_chunks = [];
    let wang_cur = '';
    for (let wang_p of wang_paras) {
        while (wang_p.length > wang_size) {
            let wang_cut = -1;
            for (const m of wang_p.slice(0, wang_size).matchAll(/[。！？；!?;]/g)) wang_cut = m.index + 1;
            if (wang_cut <= 0) wang_cut = wang_size;
            if (wang_cur) { wang_chunks.push(wang_cur); wang_cur = ''; }
            wang_chunks.push(wang_p.slice(0, wang_cut));
            wang_p = wang_p.slice(wang_cut);
        }
        const wang_merged = wang_cur ? wang_cur + '\n' + wang_p : wang_p;
        if (wang_merged.length > wang_size) { wang_chunks.push(wang_cur); wang_cur = wang_p; }
        else wang_cur = wang_merged;
    }
    if (wang_cur) wang_chunks.push(wang_cur);
    return wang_chunks;
}

/* 查询词项：中文二元组 + 英文/数字词 */
function wang_terms(wang_q) {
    const wang_set = new Set();
    for (const seg of (wang_q.match(/[\u4e00-\u9fff]+/g) || [])) {
        if (seg.length === 1) wang_set.add(seg);
        else for (let i = 0; i < seg.length - 1; i++) wang_set.add(seg.slice(i, i + 2));
    }
    for (const w of (wang_q.toLowerCase().match(/[a-z0-9]{2,}/g) || [])) wang_set.add(w);
    return [...wang_set];
}

/* TF 打分检索，返回前 topN 命中块 */
function wang_search(wang_query, wang_topN = 4) {
    const wang_ts = wang_terms(wang_query);
    return wang_kb.wang_allChunks().map(r => {
        const wang_lower = r.wang_content.toLowerCase();
        let wang_score = 0;
        for (const t of wang_ts) {
            let wang_cnt = 0, wang_idx = 0;
            while ((wang_idx = wang_lower.indexOf(t, wang_idx)) >= 0) { wang_cnt++; wang_idx += t.length; }
            if (wang_cnt) wang_score += (1 + Math.log(wang_cnt)) / (1 + Math.log(r.wang_content.length / 120 + 1));
        }
        return { wang_doc_id: r.wang_doc_id, wang_filename: r.wang_filename, wang_seq: r.wang_seq, wang_content: r.wang_content, wang_score: Number(wang_score.toFixed(3)) };
    }).filter(r => r.wang_score > 0).sort((a, b) => b.wang_score - a.wang_score).slice(0, wang_topN);
}

/* ================= 接口 ================= */

/**
 * POST /api/kb/upload
 * 请求体：{ wang_filename: "xx.docx", wang_base64: "..." }（前端 FileReader 转 base64）
 */
export function wang_apiKbUpload(req, res) {
    const { wang_filename, wang_base64 } = req.body || {};
    if (!wang_filename || !wang_base64) return res.json(wang_res(1, '缺少 wang_filename 或 wang_base64', {}));
    const wang_ext = String(wang_filename).split('.').pop().toLowerCase();
    if (!['doc', 'docx', 'txt'].includes(wang_ext)) {
        return res.json(wang_res(2, '仅支持 doc / docx / txt 文件', {}));
    }
    let wang_buf;
    try { wang_buf = Buffer.from(String(wang_base64), 'base64'); } catch (e) {
        return res.json(wang_res(3, 'base64 解码失败', {}));
    }
    console.log(`[wang_kb] 上传文件 ${wang_filename}（${wang_ext}，${wang_buf.length} 字节）`);

    let wang_text = '';
    try {
        if (wang_ext === 'docx') wang_text = wang_parseDocx(wang_buf);
        else if (wang_ext === 'doc') wang_text = wang_parseDoc(wang_buf);
        else wang_text = wang_parseTxt(wang_buf);
    } catch (wang_e) {
        console.error('[wang_kb] 解析失败:', wang_e.message);
        return res.json(wang_res(4, '文件解析失败：' + wang_e.message, {}));
    }

    const wang_chunks = wang_chunkText(wang_text);
    if (!wang_chunks.length) return res.json(wang_res(5, '未从文件中解析出文本内容', {}));

    const wang_docId = wang_kb.wang_addDoc(String(wang_filename).slice(0, 100), wang_ext, wang_buf.length, 'ok');
    wang_chunks.forEach((c, i) => wang_kb.wang_addChunk(wang_docId, i + 1, c));
    wang_kb.wang_setDocChunks(wang_docId, wang_chunks.length);
    console.log(`[wang_kb] 入库完成：doc_id=${wang_docId}，共 ${wang_chunks.length} 块 / ${wang_text.length} 字`);
    res.json(wang_res(0, '上传并解析成功', {
        wang_doc_id: wang_docId, wang_filename, wang_filetype: wang_ext,
        wang_filesize: wang_buf.length, wang_chunks: wang_chunks.length, wang_chars: wang_text.length
    }));
}

/* GET /api/kb/docs 知识库文档列表 */
export function wang_apiKbDocs(req, res) {
    res.json(wang_res(0, '获取成功', wang_kb.wang_listDocs()));
}

/* DELETE /api/kb/docs/:wang_id 删除文档（级联删分块） */
export function wang_apiKbDelete(req, res) {
    const wang_ok = wang_kb.wang_deleteDoc(Number(req.params.wang_id));
    res.json(wang_ok ? wang_res(0, '文档及其分块已删除', {}) : wang_res(3, '文档不存在', {}));
}

/* POST /api/kb/search 检索演示：{ wang_query } → 命中块 */
export function wang_apiKbSearch(req, res) {
    const wang_query = String((req.body || {}).wang_query || '').trim();
    if (!wang_query) return res.json(wang_res(1, '缺少参数 wang_query', {}));
    const wang_hits = wang_search(wang_query);
    console.log(`[wang_kb] 检索 "${wang_query}" → 命中 ${wang_hits.length} 块`);
    res.json(wang_res(0, '检索完成', { wang_query, wang_hits }));
}

/**
 * POST /api/kb/chat/stream 基于知识库的 SSE 流式问答
 * 请求体：{ wang_content: "用户问题" }
 */
export async function wang_apiKbChatStream(req, res) {
    const wang_question = String((req.body || {}).wang_content || '').trim();
    if (!wang_question) return res.status(400).json(wang_res(1, 'wang_content 必填', {}));
    if (!process.env.LLM_API_KEY) return res.status(400).json(wang_res(2, '未配置 LLM_API_KEY', {}));

    /* 1. 检索知识库 */
    const wang_hits = wang_search(wang_question);
    console.log(`[wang_kb_chat] 问题："${wang_question}" → 检索命中 ${wang_hits.length} 块:`,
        JSON.stringify(wang_hits.map(h => ({ 文件: h.wang_filename, 块: h.wang_seq, 得分: h.wang_score }))));

    /* 2. 组装 RAG 提示词（角色 + 依据资料作答约束 + 资料注入） */
    const wang_material = wang_hits.length
        ? wang_hits.map((h, i) => `【资料${i + 1}｜来源：${h.wang_filename} 第${h.wang_seq}块】\n${h.wang_content}`).join('\n\n')
        : '（知识库中没有检索到相关内容）';
    const wang_messages = [
        {
            role: 'system',
            content: '你是「WangAI 智能客服」，由王云鹤（学号24002060416）开发，依据企业知识库资料回答用户问题。规则：'
                + '1) 只根据下方【知识库资料】作答，资料中没有的内容要如实说明不知道，不得编造；'
                + '2) 回答用简体中文 Markdown，先给结论再分点说明；3) 涉及具体政策/数字时引用资料原文表述。'
                + '\n\n====== 知识库资料 ======\n' + wang_material
        },
        { role: 'user', content: wang_question }
    ];
    const wang_payload = { model: wang_llmModel, messages: wang_messages, stream: true };
    console.log('[wang_kb_chat] → 发送给大模型的数据:', JSON.stringify(wang_payload).slice(0, 3000));

    /* 3. SSE 响应 */
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const wang_abort = new AbortController();
    let wang_closed = false;
    let wang_full = '';
    const wang_t0 = Date.now();
    res.on('close', () => { if (!res.writableEnded) { wang_closed = true; wang_abort.abort(); } });

    try {
        const wang_up = await wang_llmFetch(wang_payload, wang_abort.signal);
        if (!wang_up.ok) {
            const wang_errText = (await wang_up.text()).slice(0, 300);
            if (!wang_closed) res.write('data: ' + JSON.stringify({ wang_error: '大模型服务错误（HTTP ' + wang_up.status + '）：' + wang_errText }) + '\n\n');
            return res.end();
        }
        const wang_reader = wang_up.body.getReader();
        const wang_dec = new TextDecoder();
        let wang_buf = '';
        while (true) {
            const { done, value } = await wang_reader.read();
            if (done) break;
            wang_buf += wang_dec.decode(value, { stream: true });
            let wang_i;
            while ((wang_i = wang_buf.indexOf('\n')) >= 0) {
                const wang_line = wang_buf.slice(0, wang_i).trim();
                wang_buf = wang_buf.slice(wang_i + 1);
                if (!wang_line.startsWith('data:')) continue;
                const wang_data = wang_line.slice(5).trim();
                if (wang_data === '[DONE]') continue;
                try {
                    const wang_delta = JSON.parse(wang_data)?.choices?.[0]?.delta?.content || '';
                    if (wang_delta) {
                        wang_full += wang_delta;
                        if (!wang_closed) res.write('data: ' + JSON.stringify({ wang_delta }) + '\n\n');
                    }
                } catch (e) { /* 半行 JSON */ }
            }
            if (wang_closed) { await wang_reader.cancel(); break; }
        }
        console.log(`[wang_kb_chat] ← 从大模型接收到的完整数据 (${Date.now() - wang_t0}ms${wang_closed ? '，前端已中断' : ''}):`, wang_full);
        if (!wang_closed) {
            res.write('data: ' + JSON.stringify({ wang_done: true, wang_refs: wang_hits.map(h => ({ wang_filename: h.wang_filename, wang_seq: h.wang_seq, wang_score: h.wang_score })), wang_ms: Date.now() - wang_t0 }) + '\n\n');
            res.end();
        }
    } catch (wang_e) {
        if (wang_e.name !== 'AbortError' && !wang_closed) {
            console.error('[wang_kb_chat] 调用失败:', wang_e);
            res.write('data: ' + JSON.stringify({ wang_error: '调用大模型失败：' + wang_e.message }) + '\n\n');
            res.end();
        }
    }
}
