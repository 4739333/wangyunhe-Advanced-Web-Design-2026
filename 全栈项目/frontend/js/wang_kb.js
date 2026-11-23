/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* RAG 知识库页逻辑：
   - 上传：FileReader 读 ArrayBuffer → base64 → POST /api/kb/upload（JSON，避免 multipart 依赖）
   - 管理：GET /api/kb/docs 列表 + DELETE /api/kb/docs/:id 删除
   - 检索演示：POST /api/kb/search 展示命中分块与得分
   - 智能客服问答：POST /api/kb/chat/stream SSE 流式 + AbortController 中断 + Markdown 渲染（wang_api.js 的 wang_md）
   - 所有发送/接收数据输出浏览器控制台 */

const wang_kArea = document.getElementById('wang_msgArea');
const wang_kInput = document.getElementById('wang_inputBox');
const wang_kSend = document.getElementById('wang_sendBtn');
const wang_kStop = document.getElementById('wang_stopBtn');
const wang_kFile = document.getElementById('wang_fileInput');
const wang_kUpload = document.getElementById('wang_uploadBtn');
const wang_kRows = document.getElementById('wang_docRows');
const wang_kTip = document.getElementById('wang_upTip');
let wang_kBusy = false;
let wang_kCtl = null;

/* ---------- 气泡 ---------- */
function wang_kbBubble(wang_role, wang_content, wang_idAttr) {
    const wang_isAi = wang_role !== 'user';
    return `<div class="wang_msg ${wang_isAi ? 'wang_msg_ai' : 'wang_msg_user'}" ${wang_idAttr || ''}>
        <span class="wang_avatar"><i class="wang_ic ${wang_isAi ? 'wang_ic_bell' : 'wang_ic_user'}"></i></span>
        <div><div class="wang_bubble ${wang_isAi ? 'wang_md_on' : ''}">${wang_isAi ? wang_md(wang_content) : wang_esc(wang_content)}</div>
        <div class="wang_time">${wang_isAi ? '智能客服' : '我'} · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div></div>
    </div>`;
}

/* ---------- 上传 ---------- */
function wang_showTip(wang_text, wang_ok) {
    wang_kTip.style.display = 'block';
    wang_kTip.style.background = wang_ok ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
    wang_kTip.style.color = wang_ok ? '#4ADE80' : '#F87171';
    wang_kTip.textContent = wang_text;
}

wang_kUpload.addEventListener('click', async () => {
    const wang_f = wang_kFile.files[0];
    if (!wang_f) { wang_showTip('请先选择 doc / docx / txt 文件', false); return; }
    wang_kUpload.disabled = true;
    wang_showTip('上传解析中…', true);
    try {
        const wang_buf = await wang_f.arrayBuffer();
        const wang_base64 = wang_toB64(wang_buf);
        const wang_payload = { wang_filename: wang_f.name, wang_base64: wang_base64.slice(0, 40) + '…（base64 共 ' + wang_base64.length + ' 字符）' };
        console.log('[wang_kb] → 发送给后端的数据:', JSON.stringify(wang_payload));
        const wang_res = await fetch('/api/kb/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wang_filename: wang_f.name, wang_base64 })
        });
        const wang_json = await wang_res.json();
        console.log('[wang_kb] ← 后端响应:', JSON.stringify(wang_json));
        if (wang_json.code === 0) {
            wang_showTip(`《${wang_f.name}》解析成功：${wang_json.data.wang_chunks} 块 / ${wang_json.data.wang_chars} 字`, true);
            wang_kFile.value = '';
            wang_loadDocs();
        } else {
            wang_showTip('上传失败：' + wang_json.msg, false);
        }
    } catch (wang_e) {
        console.error('[wang_kb] 上传异常:', wang_e);
        wang_showTip('上传失败：' + wang_e.message, false);
    }
    wang_kUpload.disabled = false;
});

/* ---------- 文档列表 / 删除 ---------- */
async function wang_loadDocs() {
    const wang_json = await wang_getKbDocs();
    if (wang_json.code !== 0) {
        wang_kRows.innerHTML = '<tr><td colspan="5" style="color:#F87171">加载失败</td></tr>';
        return;
    }
    wang_kRows.innerHTML = wang_json.data.length ? wang_json.data.map(d => `
        <tr>
            <td title="${wang_esc(d.wang_filename)}">${wang_esc(d.wang_filename.length > 18 ? d.wang_filename.slice(0, 18) + '…' : d.wang_filename)}</td>
            <td><span class="wang_badge">${wang_esc(d.wang_filetype)}</span></td>
            <td>${d.wang_chunks}</td>
            <td>${wang_esc(String(d.wang_created_at).slice(5, 16))}</td>
            <td><button data-del="${d.wang_id}">删除</button></td>
        </tr>`).join('')
        : '<tr><td colspan="5" style="color:#94A3B8">知识库为空，请上传文件</td></tr>';
}

wang_kRows.addEventListener('click', async (e) => {
    const wang_btn = e.target.closest('[data-del]');
    if (!wang_btn) return;
    if (!confirm('删除该文档及其全部分块？')) return;
    const wang_json = await wang_deleteKbDoc(Number(wang_btn.dataset.del));
    console.log('[wang_kb] ← 删除响应:', JSON.stringify(wang_json));
    wang_loadDocs();
});

/* ---------- 检索演示 ---------- */
document.getElementById('wang_searchBtn').addEventListener('click', async () => {
    const wang_q = document.getElementById('wang_searchInput').value.trim();
    const wang_box = document.getElementById('wang_hitBox');
    if (!wang_q) return;
    const wang_json = await wang_kbSearch(wang_q);
    if (wang_json.code !== 0) { wang_box.innerHTML = '<div class="wang_hit">检索失败：' + wang_esc(wang_json.msg) + '</div>'; return; }
    const wang_hits = wang_json.data.wang_hits;
    wang_box.innerHTML = wang_hits.length ? wang_hits.map((h, i) => `
        <div class="wang_hit"><b>#${i + 1}｜${wang_esc(h.wang_filename)} 第${h.wang_seq}块｜得分 ${h.wang_score}</b><br>${wang_esc(h.wang_content.slice(0, 120))}${h.wang_content.length > 120 ? '…' : ''}</div>`).join('')
        : '<div class="wang_hit">未命中任何分块（换个关键词试试）</div>';
});

/* ---------- RAG 流式问答 ---------- */
function wang_setBusy(wang_on) {
    wang_kBusy = wang_on;
    wang_kSend.disabled = wang_on;
    wang_kStop.style.display = wang_on ? 'inline-block' : 'none';
}

async function wang_ask() {
    const wang_text = wang_kInput.value.trim();
    if (!wang_text || wang_kBusy) return;
    wang_kInput.value = '';
    if (wang_kArea.querySelector('.wang_empty')) wang_kArea.innerHTML = '';

    wang_kArea.insertAdjacentHTML('beforeend', wang_kbBubble('user', wang_text));
    wang_kArea.insertAdjacentHTML('beforeend', wang_kbBubble('ai', '', 'id="wang_klive"'));
    const wang_liveMsg = document.getElementById('wang_klive');
    const wang_liveBox = wang_liveMsg.querySelector('.wang_bubble');
    wang_liveBox.innerHTML = '<span class="wang_md_think">检索知识库并连接大模型…</span>';

    const wang_payload = { wang_content: wang_text };
    console.log('[wang_kb_chat] → 发送给后端（RAG 问答）的数据:', JSON.stringify(wang_payload));

    wang_setBusy(true);
    wang_kCtl = new AbortController();
    let wang_full = '';
    let wang_failed = '';
    try {
        const wang_res = await fetch('/api/kb/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wang_payload),
            signal: wang_kCtl.signal
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
                    console.log('[wang_kb_chat] ← 收到增量:', JSON.stringify(wang_ev));
                    wang_liveBox.innerHTML = wang_md(wang_full) + '<span class="wang_stream_cursor"></span>';
                    wang_kArea.scrollTop = wang_kArea.scrollHeight;
                } else if (wang_ev.wang_error) {
                    wang_failed = wang_ev.wang_error;
                } else if (wang_ev.wang_done) {
                    console.log('[wang_kb_chat] ← 流式结束（含引用来源）:', JSON.stringify(wang_ev));
                    const wang_refs = (wang_ev.wang_refs || []).map(r => `<span class="wang_ref">${wang_esc(r.wang_filename)}·块${r.wang_seq}·${r.wang_score}</span>`).join('');
                    wang_liveMsg.querySelector('.wang_time').insertAdjacentHTML('afterend', wang_refs || '<span class="wang_ref">未命中知识库资料</span>');
                }
            }
        }
        if (wang_failed) {
            wang_liveBox.innerHTML = wang_esc('⚠ ' + wang_failed);
        } else if (wang_full) {
            wang_liveBox.innerHTML = wang_md(wang_full);
        } else {
            wang_liveBox.innerHTML = '<span class="wang_md_think">（模型未返回内容）</span>';
        }
    } catch (wang_e) {
        if (wang_e.name === 'AbortError') {
            console.log('[wang_kb_chat] 用户中断了流式请求');
            wang_liveBox.innerHTML = (wang_full ? wang_md(wang_full) : '') + '<span class="wang_md_think">（已手动停止）</span>';
        } else {
            console.error('[wang_kb_chat] 请求失败:', wang_e);
            wang_liveBox.innerHTML = wang_esc('⚠ 网络错误：' + wang_e.message);
        }
    }
    wang_kCtl = null;
    wang_setBusy(false);
    wang_kArea.scrollTop = wang_kArea.scrollHeight;
}

wang_kSend.addEventListener('click', wang_ask);
wang_kStop.addEventListener('click', () => { if (wang_kCtl) wang_kCtl.abort(); });
wang_kInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); wang_ask(); }
});

wang_loadDocs();
