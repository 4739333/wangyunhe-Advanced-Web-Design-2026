/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* AI 控制器：代理调用大模型 OpenAI 兼容接口（密钥仅存于 backend/.env，前端不接触）
   - POST /api/ai/chat         非流式对话（兼容旧接口）
   - POST /api/ai/chat/stream  SSE 流式对话：消息落库、多轮上下文、超预算历史压缩摘要、支持前端中断 */
import dotenv from 'dotenv';
import * as wang_model from '../models/wang_chatModel.js';

dotenv.config();

const wang_llmKey = process.env.LLM_API_KEY || '';
const wang_llmBase = (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
export const wang_llmModel = process.env.LLM_MODEL || 'deepseek-flash';

/* 系统提示词（提示词工程：角色设定 + 任务约束 + 输出格式） */
const wang_sysPrompt = '你是「WangAI」，由大连东软信息学院学生王云鹤（学号24002060416）开发的全栈 AI 聊天助手。回答要求：'
    + '1) 始终使用简体中文；2) 内容准确、简洁、有条理；3) 使用 Markdown 排版：小节标题用 ##，要点用列表，代码必须放入标注语言的围栏代码块；'
    + '4) 不确定的信息如实说明，不要编造；5) 语气友好自然。';

/* 上下文预算：保留最近 wang_keep 条消息原文；更早消息总字数超过 wang_budget 时压缩为摘要写入会话表 */
const wang_keep = 6;
const wang_budget = 1600;

function wang_res(code, msg, data) {
    return { code, msg, data };
}

/* 统一的上游请求（signal 可选，用于中断传播） */
export async function wang_llmFetch(wang_payload, wang_signal) {
    return fetch(wang_llmBase + '/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + wang_llmKey
        },
        body: JSON.stringify(wang_payload),
        signal: wang_signal
    });
}

/**
 * POST /api/ai/chat （非流式，保留兼容）
 * 请求体：{ wang_messages: [{ role, content }, ...] }（OpenAI 格式，含历史上下文）
 */
export async function wang_apiAiChat(req, res) {
    const wang_messages = (req.body || {}).wang_messages;
    if (!Array.isArray(wang_messages) || !wang_messages.length) {
        return res.json(wang_res(1, '缺少参数 wang_messages（数组）', {}));
    }
    if (!wang_llmKey) {
        return res.json(wang_res(2, '未配置 LLM_API_KEY，请检查 backend/.env', {}));
    }

    const wang_payload = { model: wang_llmModel, messages: wang_messages, stream: false };
    console.log('[wang_ai] → 发送给大模型的数据:', JSON.stringify(wang_payload));

    const wang_t0 = Date.now();
    try {
        const wang_up = await wang_llmFetch(wang_payload);
        const wang_text = await wang_up.text();
        console.log(`[wang_ai] ← 从大模型接收到的数据 (HTTP ${wang_up.status}, ${Date.now() - wang_t0}ms):`, wang_text.slice(0, 2000));

        let wang_json = null;
        try { wang_json = JSON.parse(wang_text); } catch (e) { /* 非 JSON 响应 */ }

        if (!wang_up.ok) {
            const wang_err = wang_json && wang_json.error ? wang_json.error.message : wang_text.slice(0, 200);
            return res.json(wang_res(3, '大模型服务返回错误（HTTP ' + wang_up.status + '）：' + wang_err, {}));
        }

        const wang_reply = wang_json?.choices?.[0]?.message?.content ?? '';
        return res.json(wang_res(0, '回答成功', {
            wang_reply,
            wang_model: wang_json?.model || wang_llmModel,
            wang_usage: wang_json?.usage || null,
            wang_ms: Date.now() - wang_t0
        }));
    } catch (wang_e) {
        console.error('[wang_ai] 调用大模型失败:', wang_e);
        return res.json(wang_res(4, '调用大模型失败：' + wang_e.message, {}));
    }
}

/* 把早期对话压缩为摘要（调用大模型，失败返回空串） */
async function wang_summarize(wang_oldMsgs, wang_prevSummary) {
    const wang_lines = wang_oldMsgs.map(m => (m.wang_role === 'user' ? '用户' : 'AI') + '：' + m.wang_content).join('\n');
    const wang_payload = {
        model: wang_llmModel,
        stream: false,
        messages: [
            { role: 'system', content: '你是对话压缩器，负责把多轮对话浓缩为要点摘要，只输出摘要正文。' },
            {
                role: 'user',
                content: '请把以下对话压缩成不超过 200 字的中文摘要，保留关键信息、已得结论与未完成任务。'
                    + (wang_prevSummary ? '\n已有摘要：' + wang_prevSummary + '\n' : '')
                    + '\n需要压缩的对话：\n' + wang_lines
            }
        ]
    };
    console.log('[wang_ai_stream] → 发送给大模型的摘要压缩请求:', JSON.stringify(wang_payload).slice(0, 1500));
    try {
        const wang_up = await wang_llmFetch(wang_payload);
        const wang_json = await wang_up.json();
        const wang_text = wang_json?.choices?.[0]?.message?.content ?? '';
        console.log('[wang_ai_stream] ← 收到压缩摘要:', wang_text);
        return String(wang_text).trim();
    } catch (wang_e) {
        console.error('[wang_ai_stream] 摘要压缩失败：', wang_e.message);
        return '';
    }
}

/**
 * POST /api/ai/chat/stream （SSE 流式）
 * 请求体：{ wang_session_id, wang_content }
 * 事件流：data: {"wang_delta":"..."} / {"wang_done":true,...} / {"wang_error":"..."}
 */
export async function wang_apiAiChatStream(req, res) {
    const { wang_session_id, wang_content } = req.body || {};
    const wang_text = String(wang_content || '').trim();
    if (!wang_session_id || !wang_text) {
        return res.status(400).json(wang_res(1, 'wang_session_id 与 wang_content 必填', {}));
    }
    if (!wang_llmKey) {
        return res.status(400).json(wang_res(2, '未配置 LLM_API_KEY，请检查 backend/.env', {}));
    }
    const wang_session = wang_model.wang_getSession(Number(wang_session_id));
    if (!wang_session) {
        return res.status(400).json(wang_res(3, '会话不存在', {}));
    }

    /* 1. 用户消息落库 */
    wang_model.wang_addMessage(wang_session.wang_id, 'user', wang_text);

    /* 2. 读取压缩水位线之后的历史消息 */
    let wang_history = wang_model.wang_listMessagesAfter(wang_session.wang_id, wang_session.wang_compressed_id || 0);

    /* 3. Token 预算控制：超出预算的早期消息压缩为摘要并写入会话表 */
    let wang_summary = wang_session.wang_summary || '';
    if (wang_history.length > wang_keep) {
        const wang_old = wang_history.slice(0, wang_history.length - wang_keep);
        const wang_oldLen = wang_old.reduce((s, m) => s + m.wang_content.length, 0);
        if (wang_oldLen > wang_budget) {
            const wang_newSummary = await wang_summarize(wang_old, wang_summary);
            if (wang_newSummary) {
                wang_summary = wang_newSummary;
                wang_model.wang_setSummary(wang_session.wang_id, wang_summary, wang_old[wang_old.length - 1].wang_id);
                wang_history = wang_history.slice(wang_old.length);
                console.log(`[wang_ai_stream] 已压缩 ${wang_old.length} 条早期消息 → 摘要并写入 wang_sessions`);
            }
        }
    }

    /* 4. 拼装多轮上下文 messages（system + 摘要 + 最近原文） */
    const wang_messages = [{ role: 'system', content: wang_sysPrompt }];
    if (wang_summary) wang_messages.push({ role: 'system', content: '【早前对话摘要】' + wang_summary });
    for (const m of wang_history) {
        wang_messages.push({ role: m.wang_role === 'user' ? 'user' : 'assistant', content: m.wang_content });
    }

    const wang_payload = { model: wang_llmModel, messages: wang_messages, stream: true };
    console.log('[wang_ai_stream] → 发送给大模型的数据:', JSON.stringify(wang_payload));

    /* 5. SSE 响应头 */
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const wang_abort = new AbortController();
    let wang_closed = false;
    let wang_full = '';
    const wang_t0 = Date.now();
    /* 注意：req 的 close 在请求体读完即触发，必须监听 res 且排除正常结束 */
    res.on('close', () => {
        if (!res.writableEnded) { wang_closed = true; wang_abort.abort(); }
    });

    try {
        const wang_up = await wang_llmFetch(wang_payload, wang_abort.signal);
        if (!wang_up.ok) {
            const wang_errText = (await wang_up.text()).slice(0, 300);
            console.error(`[wang_ai_stream] 大模型返回 HTTP ${wang_up.status}:`, wang_errText);
            if (!wang_closed) res.write('data: ' + JSON.stringify({ wang_error: '大模型服务错误（HTTP ' + wang_up.status + '）：' + wang_errText }) + '\n\n');
            return res.end();
        }

        /* 6. 逐块解析上游 SSE，转发增量内容 */
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
                } catch (e) { /* 半行 JSON，等待下一块 */ }
            }
            if (wang_closed) { await wang_reader.cancel(); break; }
        }

        /* 7. 完整（或中断后的部分）回复落库 */
        const wang_aiMsgId = Number(wang_model.wang_addMessage(wang_session.wang_id, 'ai', wang_full || '（回复为空）'));
        console.log(`[wang_ai_stream] ← 从大模型接收到的完整数据 (${Date.now() - wang_t0}ms${wang_closed ? '，前端已中断' : ''}):`, wang_full);
        if (!wang_closed) {
            res.write('data: ' + JSON.stringify({ wang_done: true, wang_ai_msg_id: wang_aiMsgId, wang_ms: Date.now() - wang_t0 }) + '\n\n');
            res.end();
        }
    } catch (wang_e) {
        if (wang_e.name === 'AbortError' || wang_closed) {
            /* 前端点击停止：保存已生成的部分回复 */
            if (wang_full) wang_model.wang_addMessage(wang_session.wang_id, 'ai', wang_full);
            console.log('[wang_ai_stream] 前端中断，已保存部分回复（' + wang_full.length + ' 字）');
            try { res.end(); } catch (e) { /* 响应已关闭 */ }
        } else {
            console.error('[wang_ai_stream] 调用大模型失败:', wang_e);
            if (!wang_closed) {
                res.write('data: ' + JSON.stringify({ wang_error: '调用大模型失败：' + wang_e.message }) + '\n\n');
                res.end();
            }
        }
    }
}
