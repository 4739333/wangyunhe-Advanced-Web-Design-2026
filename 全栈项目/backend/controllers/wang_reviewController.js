/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-17 | 大模型：Qwen3.8-Flash */
/* 商业评论情感分类控制器：
   - POST /api/review/classify：接收前端上传的 xlsx（base64），原生解析 zip + sheet XML，
     提取评论列 → 一次 LLM 请求批量分类（好评/中评/差评）→ 收发数据全部打印服务端控制台 */
import zlib from 'node:zlib';
import { wang_llmFetch, wang_llmModel } from './wang_aiController.js';

function wang_res(code, msg, data) {
    return { code, msg, data };
}

/* ================= xlsx 原生解析 ================= */

/* 在 zip 缓冲区中按中央目录定位条目并解压（支持 store/deflate） */
function wang_zipEntry(wang_buf, wang_name) {
    let wang_eocd = -1;
    for (let i = wang_buf.length - 22; i >= 0 && i > wang_buf.length - 66000; i--) {
        if (wang_buf.readUInt32LE(i) === 0x06054b50) { wang_eocd = i; break; }
    }
    if (wang_eocd < 0) throw new Error('不是有效的 xlsx（未找到 zip 目录）');
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
    return null; // 条目不存在（如没有 sharedStrings 的文件）
}

function wang_xmlDecode(wang_s) {
    return wang_s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
}

/* sharedStrings.xml → 字符串数组（<si> 内所有 <t> 拼接） */
function wang_parseSharedStrings(wang_xml) {
    return [...wang_xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m =>
        [...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map(t => wang_xmlDecode(t[1])).join(''));
}

/* sheet XML → 二维数组（行→列），支持 t="s"（共享字符串）/ inlineStr / 数字 / 公式缓存值 */
function wang_parseSheet(wang_xml, wang_shared) {
    const wang_rows = [];
    for (const rowM of wang_xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const wang_cells = [];
        for (const cellM of rowM[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
            const wang_attrs = cellM[1] || '';
            const wang_inner = cellM[2] || '';
            const refM = wang_attrs.match(/r="([A-Z]+)\d+"/);
            let wang_col = 0;
            if (refM) for (const ch of refM[1]) wang_col = wang_col * 26 + (ch.charCodeAt(0) - 64);
            wang_col--; // 0 基
            const typeM = wang_attrs.match(/t="([^"]+)"/);
            const wang_type = typeM ? typeM[1] : '';
            let wang_val = '';
            if (wang_type === 's') {
                const vM = wang_inner.match(/<v>([^<]*)<\/v>/);
                if (vM) wang_val = wang_shared[+vM[1]] || '';
            } else if (wang_type === 'inlineStr') {
                wang_val = [...wang_inner.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map(t => wang_xmlDecode(t[1])).join('');
            } else if (wang_type !== 'str') {
                const vM = wang_inner.match(/<v>([^<]*)<\/v>/);
                if (vM) wang_val = wang_xmlDecode(vM[1]);
                else {
                    const tM = wang_inner.match(/<t(?:\s[^>]*)?>([^<]*)<\/t>/);
                    if (tM) wang_val = wang_xmlDecode(tM[1]);
                }
            } else {
                const vM = wang_inner.match(/<v>([^<]*)<\/v>/);
                if (vM) wang_val = wang_xmlDecode(vM[1]);
            }
            wang_cells[wang_col] = wang_val.trim();
        }
        wang_rows.push(wang_cells);
    }
    return wang_rows;
}

/* 从表格中提取评论文本列：优先表头含「评论/内容/评价」的列，否则取平均字数最长的文本列 */
function wang_extractReviews(wang_rows) {
    if (!wang_rows.length) return [];
    const wang_dataRows = wang_rows.slice(1).filter(r => r && r.some(c => c));
    const wang_src = wang_dataRows.length ? wang_dataRows : wang_rows;
    const wang_maxCol = Math.max(...wang_src.map(r => r.length));
    let wang_pick = -1;
    /* 1. 表头匹配 */
    const wang_header = wang_rows[0] || [];
    for (let c = 0; c < wang_header.length; c++) {
        if (/评论|内容|评价|review|content/i.test(wang_header[c] || '')) { wang_pick = c; break; }
    }
    /* 2. 回退：平均字数最长的列（排除纯数字列） */
    if (wang_pick < 0) {
        let wang_best = -1, wang_bestAvg = 0;
        for (let c = 0; c < wang_maxCol; c++) {
            let wang_sum = 0, wang_cnt = 0;
            for (const r of wang_src) {
                const v = r[c] || '';
                if (v && !/^\d+(\.\d+)?$/.test(v)) { wang_sum += v.length; wang_cnt++; }
            }
            const wang_avg = wang_cnt ? wang_sum / wang_cnt : 0;
            if (wang_avg > wang_bestAvg) { wang_bestAvg = wang_avg; wang_best = c; }
        }
        wang_pick = wang_best;
    }
    if (wang_pick < 0 || wang_pick >= wang_maxCol) return [];
    return wang_src.map(r => (r[wang_pick] || '').trim()).filter(t => t && !/^\d+$/.test(t));
}

/* ================= LLM 批量分类 ================= */

const wang_sentiments = ['好评', '中评', '差评'];

/* 解析模型输出「编号|分类」，容错 ：、空格、markdown 加粗等写法 */
function wang_parseClassify(wang_text, wang_total) {
    const wang_map = new Map();
    const wang_re = /(\d{1,3})\s*[|｜:：.、]\s*\**\s*(好评|中评|差评)/g;
    for (const m of wang_text.matchAll(wang_re)) {
        const wang_idx = +m[1];
        if (wang_idx >= 1 && wang_idx <= wang_total && !wang_map.has(wang_idx)) wang_map.set(wang_idx, m[2]);
    }
    return wang_map;
}

/**
 * POST /api/review/classify
 * 请求体：{ wang_filename: "xx.xlsx", wang_base64: "..." }（前端 FileReader 转 base64）
 * 响应 data：{ wang_results:[{wang_index,wang_review,wang_sentiment}], wang_summary, wang_model, wang_ms }
 */
export async function wang_apiReviewClassify(req, res) {
    const { wang_filename, wang_base64 } = req.body || {};
    if (!wang_filename || !wang_base64) return res.json(wang_res(1, '缺少 wang_filename 或 wang_base64', {}));
    const wang_ext = String(wang_filename).split('.').pop().toLowerCase();
    if (wang_ext !== 'xlsx') return res.json(wang_res(2, '仅支持 xlsx 文件', {}));

    let wang_buf;
    try { wang_buf = Buffer.from(String(wang_base64), 'base64'); } catch (e) {
        return res.json(wang_res(3, 'base64 解码失败', {}));
    }
    console.log(`[wang_review] 上传文件 ${wang_filename}（${wang_buf.length} 字节）`);

    /* 1. 原生解析 xlsx */
    let wang_reviews = [];
    try {
        const wang_ssBuf = wang_zipEntry(wang_buf, 'xl/sharedStrings.xml');
        const wang_shared = wang_ssBuf ? wang_parseSharedStrings(wang_ssBuf.toString('utf8')) : [];
        const wang_sheetBuf = wang_zipEntry(wang_buf, 'xl/worksheets/sheet1.xml');
        if (!wang_sheetBuf) throw new Error('未找到工作表 xl/worksheets/sheet1.xml');
        const wang_rows = wang_parseSheet(wang_sheetBuf.toString('utf8'), wang_shared);
        wang_reviews = wang_extractReviews(wang_rows);
    } catch (wang_e) {
        console.error('[wang_review] xlsx 解析失败:', wang_e.message);
        return res.json(wang_res(4, '文件解析失败：' + wang_e.message, {}));
    }
    if (!wang_reviews.length) return res.json(wang_res(5, '未从文件中解析出评论内容', {}));
    console.log(`[wang_review] 解析出 ${wang_reviews.length} 条评论，示例：${wang_reviews[0].slice(0, 40)}…`);

    /* 2. 组装 LLM 批量分类请求（一次请求分类全部评论） */
    const wang_listText = wang_reviews.map((t, i) => `${i + 1}. ${t}`).join('\n');
    const wang_payload = {
        model: wang_llmModel,
        stream: false,
        temperature: 0,
        max_tokens: 800,
        messages: [
            {
                role: 'system',
                content: '你是商业评论情感分类器。只允许输出「好评」「中评」「差评」三类之一，'
                    + '每行格式为「编号|分类」，不要输出解释或其他任何内容。'
            },
            {
                role: 'user',
                content: '请将以下商业评论逐条分类：表达满意/推荐/赞扬→好评；褒贬不一/勉强接受/中规中矩→中评；'
                    + '表达不满/投诉/避雷→差评。共 ' + wang_reviews.length + ' 条：\n' + wang_listText
            }
        ]
    };
    console.log('[wang_review] → 发送给大模型的数据:', JSON.stringify(wang_payload));

    /* 3. 调用大模型并接收 */
    const wang_t0 = Date.now();
    let wang_raw = '';
    try {
        const wang_up = await wang_llmFetch(wang_payload);
        const wang_text = await wang_up.text();
        console.log(`[wang_review] ← 从大模型接收到的原始数据 (HTTP ${wang_up.status}, ${Date.now() - wang_t0}ms):`, wang_text.slice(0, 3000));
        let wang_json = null;
        try { wang_json = JSON.parse(wang_text); } catch (e) { /* 非 JSON */ }
        if (!wang_up.ok) {
            const wang_err = wang_json && wang_json.error ? wang_json.error.message : wang_text.slice(0, 200);
            return res.json(wang_res(6, '大模型服务错误（HTTP ' + wang_up.status + '）：' + wang_err, {}));
        }
        wang_raw = String(wang_json?.choices?.[0]?.message?.content ?? '');
    } catch (wang_e) {
        console.error('[wang_review] 调用大模型失败:', wang_e.message);
        return res.json(wang_res(7, '调用大模型失败：' + wang_e.message, {}));
    }

    /* 4. 解析分类结果（缺失条目按「中评」兜底并告警） */
    const wang_map = wang_parseClassify(wang_raw, wang_reviews.length);
    const wang_results = wang_reviews.map((t, i) => {
        let wang_s = wang_map.get(i + 1) || '';
        if (!wang_s) {
            console.warn(`[wang_review] 第 ${i + 1} 条未解析到分类，按「中评」兜底`);
            wang_s = '中评';
        }
        return { wang_index: i + 1, wang_review: t, wang_sentiment: wang_s };
    });
    const wang_summary = {};
    for (const s of wang_sentiments) wang_summary[s] = wang_results.filter(r => r.wang_sentiment === s).length;
    console.log('[wang_review] 分类完成:', JSON.stringify(wang_summary), '| 模型输出:', wang_raw);

    res.json(wang_res(0, '分类成功', {
        wang_filename: String(wang_filename),
        wang_total: wang_results.length,
        wang_results, wang_summary,
        wang_model: wang_llmModel,
        wang_ms: Date.now() - wang_t0
    }));
}
