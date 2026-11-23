/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* AI 流式聊天页逻辑：
   - 会话管理：列表 / 新建 / 重命名 / 删除（当前用户固定为 王云鹤 wang_id=1）
   - 消息落库与历史回放：切换会话即从数据库加载全部消息
   - 多轮上下文与压缩摘要：由后端 /api/ai/chat/stream 组装（前端只发当前输入）
   - SSE 流式输出 + AbortController 前端中断
   - Markdown / 代码块渲染：原生手写 wang_md()，不依赖任何第三方库 */

const wang_userId = 1;
const wang_aArea = document.getElementById('wang_msgArea');
const wang_aInput = document.getElementById('wang_inputBox');
const wang_aSend = document.getElementById('wang_sendBtn');
const wang_aStop = document.getElementById('wang_stopBtn');
const wang_aList = document.getElementById('wang_sessionList');
const wang_aTitle = document.getElementById('wang_aiTitle');
const wang_aNew = document.getElementById('wang_newBtn');

let wang_sid = 0;      // 当前会话 ID
let wang_busy = false; // 是否正在流式接收
let wang_ctl = null;   // AbortController

/* Markdown 渲染函数 wang_md() 已移至公共文件 js/wang_api.js（与知识库问答页共用） */

/* ================= 气泡渲染 ================= */
function wang_bubble(wang_role, wang_content, wang_idAttr) {
    const wang_isAi = wang_role !== 'user';
    return `<div class="wang_msg ${wang_isAi ? 'wang_msg_ai' : 'wang_msg_user'}" ${wang_idAttr || ''}>
        <span class="wang_avatar"><i class="wang_ic ${wang_isAi ? 'wang_ic_star' : 'wang_ic_user'}"></i></span>
        <div><div class="wang_bubble ${wang_isAi ? 'wang_md_on' : ''}">${wang_isAi ? wang_md(wang_content) : wang_esc(wang_content)}</div>
        <div class="wang_time">${wang_isAi ? 'DeepSeek' : '我'} · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div></div>
    </div>`;
}

/* ================= 会话管理 ================= */
async function wang_loadSessions(wang_keepSid) {
    const wang_json = await wang_getSessions(wang_userId);
    if (wang_json.code !== 0) {
        wang_aList.innerHTML = '<div class="wang_empty">会话加载失败</div>';
        return;
    }
    let wang_list = wang_json.data;
    if (!wang_list.length) {
        const wang_c = await wang_createSession(wang_userId, 'AI 会话 ' + new Date().toLocaleTimeString('zh-CN'));
        if (wang_c.code === 0) return wang_loadSessions(Number(wang_c.data.wang_id));
        wang_aList.innerHTML = '<div class="wang_empty">暂无会话</div>';
        return;
    }
    wang_aList.innerHTML = wang_list.map(s => `
        <div class="wang_session ${s.wang_id === wang_keepSid ? 'wang_session_on' : ''}" data-id="${s.wang_id}">
            <span class="wang_s_name">${wang_esc(s.wang_title)}</span>
            <small>${s.wang_msg_count}</small>
            <span class="wang_s_act">
                <button data-act="rename" title="重命名">✎</button>
                <button data-act="del" title="删除">✕</button>
            </span>
        </div>`).join('');
    const wang_target = wang_list.some(s => s.wang_id === wang_keepSid) ? wang_keepSid : wang_list[0].wang_id;
    wang_selectSession(wang_target);
}

async function wang_selectSession(wang_id) {
    if (wang_busy) wang_abortStream();
    wang_sid = wang_id;
    wang_aList.querySelectorAll('.wang_session').forEach(el =>
        el.classList.toggle('wang_session_on', Number(el.dataset.id) === wang_id));
    const wang_json = await wang_getMessages(wang_id);
    if (wang_json.code !== 0) {
        wang_aArea.innerHTML = '<div class="wang_empty"><i class="wang_ic wang_ic_bell"></i>会话加载失败</div>';
        return;
    }
    wang_aTitle.textContent = wang_json.data.wang_session.wang_title;
    const wang_msgs = wang_json.data.wang_messages;
    console.log('[wang_ai_chat] ← 历史回放数据（' + wang_msgs.length + ' 条消息）:', JSON.stringify(wang_json));
    wang_aArea.innerHTML = wang_msgs.length
        ? wang_msgs.map(m => wang_bubble(m.wang_role, m.wang_content)).join('')
        : '<div class="wang_empty"><i class="wang_ic wang_ic_bell"></i>会话已就绪，发送第一条消息开始流式对话</div>';
    wang_aArea.scrollTop = wang_aArea.scrollHeight;
}

wang_aList.addEventListener('click', async (e) => {
    const wang_item = e.target.closest('.wang_session');
    if (!wang_item) return;
    const wang_id = Number(wang_item.dataset.id);
    const wang_act = e.target.closest('[data-act]');
    if (wang_act) {
        if (wang_act.dataset.act === 'rename') {
            const wang_old = wang_item.querySelector('.wang_s_name').textContent;
            const wang_new = prompt('输入新的会话名称：', wang_old);
            if (wang_new && wang_new.trim()) {
                const r = await wang_renameSession(wang_id, wang_new.trim());
                if (r.code !== 0) alert(r.msg);
                wang_loadSessions(wang_sid);
            }
        } else if (wang_act.dataset.act === 'del') {
            if (!confirm('确定删除该会话及其全部消息？')) return;
            if (wang_busy && wang_sid === wang_id) wang_abortStream();
            await wang_deleteSession(wang_id);
            wang_loadSessions(wang_sid === wang_id ? 0 : wang_sid);
        }
        return;
    }
    if (wang_sid !== wang_id) wang_selectSession(wang_id);
});

wang_aNew.addEventListener('click', async () => {
    const wang_t = prompt('新会话名称（留空自动命名）：', '');
    if (wang_t === null) return;
    const wang_title = wang_t.trim() || 'AI 会话 ' + new Date().toLocaleTimeString('zh-CN');
    const wang_c = await wang_createSession(wang_userId, wang_title);
    if (wang_c.code === 0) wang_loadSessions(Number(wang_c.data.wang_id));
});

/* ================= 流式发送与中断 ================= */
function wang_setBusy(wang_on) {
    wang_busy = wang_on;
    wang_aSend.disabled = wang_on;
    wang_aStop.style.display = wang_on ? 'inline-block' : 'none';
}

function wang_abortStream() {
    if (wang_ctl) wang_ctl.abort();
}

async function wang_sendAi() {
    const wang_text = wang_aInput.value.trim();
    if (!wang_text || wang_busy || !wang_sid) return;
    wang_aInput.value = '';

    wang_aArea.insertAdjacentHTML('beforeend', wang_bubble('user', wang_text));
    const wang_payload = { wang_session_id: wang_sid, wang_content: wang_text };
    console.log('[wang_ai_chat] → 发送给后端（转发大模型）的数据:', JSON.stringify(wang_payload));

    wang_aArea.insertAdjacentHTML('beforeend', wang_bubble('ai', '', 'id="wang_live"'));
    const wang_liveMsg = document.getElementById('wang_live');
    const wang_liveBox = wang_liveMsg.querySelector('.wang_bubble');
    wang_liveBox.innerHTML = '<span class="wang_md_think">正在连接大模型…</span>';

    wang_setBusy(true);
    wang_ctl = new AbortController();
    let wang_full = '';
    let wang_failed = '';

    try {
        const wang_res = await fetch('/api/ai/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wang_payload),
            signal: wang_ctl.signal
        });
        if (!wang_res.ok || !wang_res.body) throw new Error('HTTP ' + wang_res.status);

        const wang_reader = wang_res.body.getReader();
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
                let wang_ev;
                try { wang_ev = JSON.parse(wang_line.slice(5)); } catch (e) { continue; }
                if (wang_ev.wang_delta) {
                    wang_full += wang_ev.wang_delta;
                    console.log('[wang_ai_chat] ← 收到增量:', JSON.stringify(wang_ev));
                    wang_liveBox.innerHTML = wang_md(wang_full) + '<span class="wang_stream_cursor"></span>';
                    wang_aArea.scrollTop = wang_aArea.scrollHeight;
                } else if (wang_ev.wang_error) {
                    wang_failed = wang_ev.wang_error;
                    console.error('[wang_ai_chat] ← 流式错误:', wang_ev.wang_error);
                } else if (wang_ev.wang_done) {
                    console.log('[wang_ai_chat] ← 流式结束:', JSON.stringify(wang_ev));
                }
            }
        }

        if (wang_failed) {
            wang_liveMsg.classList.add('wang_msg_err');
            wang_liveBox.innerHTML = wang_esc('⚠ ' + wang_failed);
        } else if (wang_full) {
            wang_liveBox.innerHTML = wang_md(wang_full);
        } else {
            wang_liveBox.innerHTML = '<span class="wang_md_think">（模型未返回内容）</span>';
        }
    } catch (wang_e) {
        if (wang_e.name === 'AbortError') {
            console.log('[wang_ai_chat] 用户点击停止，已中断流式请求');
            wang_liveBox.innerHTML = (wang_full ? wang_md(wang_full) : '')
                + '<span class="wang_md_think">（已手动停止，部分内容已保存到数据库）</span>';
        } else {
            console.error('[wang_ai_chat] 请求失败:', wang_e);
            wang_liveMsg.classList.add('wang_msg_err');
            wang_liveBox.innerHTML = wang_esc('⚠ 网络错误：' + wang_e.message);
        }
    }

    wang_ctl = null;
    wang_setBusy(false);
    wang_aArea.scrollTop = wang_aArea.scrollHeight;
    wang_loadSessions(wang_sid); // 刷新会话消息计数并回放落库结果
}

wang_aSend.addEventListener('click', wang_sendAi);
wang_aStop.addEventListener('click', wang_abortStream);
wang_aInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); wang_sendAi(); }
});

wang_loadSessions(0);
