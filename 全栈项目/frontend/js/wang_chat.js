/* 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* 聊天页逻辑：用户/会话切换、消息渲染、发送与 AI 回复 */

const wang_chatState = { wang_users: [], wang_userId: 0, wang_sessionId: 0 };

const wang_userSelect = document.getElementById('wang_userSelect');
const wang_sessionList = document.getElementById('wang_sessionList');
const wang_msgArea = document.getElementById('wang_msgArea');
const wang_inputBox = document.getElementById('wang_inputBox');
const wang_sendBtn = document.getElementById('wang_sendBtn');

async function wang_initChat() {
    const wang_res = await wang_getUsers();
    if (wang_res.code !== 0) { wang_showEmpty('用户数据加载失败：' + wang_res.msg); return; }
    wang_chatState.wang_users = wang_res.data;
    wang_userSelect.innerHTML = wang_res.data.map(u =>
        `<option value="${u.wang_id}">${wang_esc(u.wang_name)}（${wang_esc(u.wang_account)}）</option>`).join('');
    wang_chatState.wang_userId = Number(wang_userSelect.value);
    await wang_loadSessions();
}

async function wang_loadSessions() {
    const wang_res = await wang_getSessions(wang_chatState.wang_userId);
    if (wang_res.code !== 0) { wang_sessionList.innerHTML = '<div style="font-size:13px;color:#94A3B8">' + wang_esc(wang_res.msg) + '</div>'; return; }
    wang_sessionList.innerHTML = wang_res.data.map(s =>
        `<div class="wang_session" data-id="${s.wang_id}"><span>${wang_esc(s.wang_title)}</span><small>${s.wang_msg_count}条</small></div>`).join('')
        || '<div style="font-size:13px;color:#94A3B8">暂无会话，点上方新建</div>';
    if (wang_res.data.length) wang_openSession(Number(wang_res.data[0].wang_id));
    else { wang_chatState.wang_sessionId = 0; wang_showEmpty('还没有会话，点左侧「新建会话」开始聊天'); }
}

function wang_showEmpty(wang_text) {
    wang_msgArea.innerHTML = `<div class="wang_empty"><i class="wang_ic wang_ic_bell"></i>${wang_esc(wang_text)}</div>`;
}

function wang_bubbleHtml(wang_msg, wang_name) {
    const wang_isAi = wang_msg.wang_role === 'ai';
    return `<div class="wang_msg ${wang_isAi ? 'wang_msg_ai' : 'wang_msg_user'}">
        <span class="wang_avatar"><i class="wang_ic ${wang_isAi ? 'wang_ic_star' : 'wang_ic_user'}"></i></span>
        <div><div class="wang_bubble">${wang_esc(wang_msg.wang_content)}</div>
        <div class="wang_time">${wang_isAi ? 'WangAI' : wang_esc(wang_name)} · ${wang_hm(wang_msg.wang_created_at)}</div></div>
    </div>`;
}

async function wang_openSession(wang_id) {
    wang_chatState.wang_sessionId = wang_id;
    [...wang_sessionList.children].forEach(el =>
        el.classList.toggle('wang_session_on', Number(el.dataset.id) === wang_id));
    const wang_res = await wang_getMessages(wang_id);
    if (wang_res.code !== 0) { wang_showEmpty(wang_res.msg); return; }
    const wang_user = wang_chatState.wang_users.find(u => u.wang_id === wang_chatState.wang_userId);
    if (!wang_res.data.wang_messages.length) { wang_msgArea.innerHTML = '<div class="wang_empty"><i class="wang_ic wang_ic_bell"></i>会话已创建，发送第一条消息吧</div>'; return; }
    wang_msgArea.innerHTML = wang_res.data.wang_messages.map(m => wang_bubbleHtml(m, wang_user ? wang_user.wang_name : '我')).join('');
    wang_msgArea.scrollTop = wang_msgArea.scrollHeight;
}

async function wang_send() {
    const wang_text = wang_inputBox.value.trim();
    if (!wang_text) return;
    if (!wang_chatState.wang_sessionId) { alert('请先新建或选择一个会话'); return; }
    wang_sendBtn.disabled = true;
    const wang_res = await wang_sendChat(wang_chatState.wang_sessionId, wang_text);
    wang_sendBtn.disabled = false;
    if (wang_res.code !== 0) { console.error('[wang_chat] 发送失败', wang_res); alert('发送失败：' + wang_res.msg); return; }
    const wang_user = wang_chatState.wang_users.find(u => u.wang_id === wang_chatState.wang_userId);
    if (wang_msgArea.querySelector('.wang_empty')) wang_msgArea.innerHTML = '';
    wang_msgArea.insertAdjacentHTML('beforeend', wang_bubbleHtml(wang_res.data.wang_user_msg, wang_user ? wang_user.wang_name : '我'));
    setTimeout(() => {
        wang_msgArea.insertAdjacentHTML('beforeend', wang_bubbleHtml(wang_res.data.wang_ai_msg, 'WangAI'));
        wang_msgArea.scrollTop = wang_msgArea.scrollHeight;
    }, 350);
    wang_inputBox.value = '';
    wang_inputBox.focus();
    wang_refreshActiveCount();
}

async function wang_refreshActiveCount() {
    const wang_el = wang_sessionList.querySelector(`[data-id="${wang_chatState.wang_sessionId}"] small`);
    if (wang_el) {
        const wang_res = await wang_getMessages(wang_chatState.wang_sessionId);
        if (wang_res.code === 0) wang_el.textContent = wang_res.data.wang_messages.length + '条';
    }
}

wang_userSelect.addEventListener('change', () => {
    wang_chatState.wang_userId = Number(wang_userSelect.value);
    wang_loadSessions();
});

wang_sessionList.addEventListener('click', e => {
    const wang_item = e.target.closest('.wang_session');
    if (wang_item) wang_openSession(Number(wang_item.dataset.id));
});

document.getElementById('wang_newChatBtn').addEventListener('click', async () => {
    const wang_res = await wang_createSession(wang_chatState.wang_userId, '新会话 ' + new Date().toLocaleTimeString('zh-CN'));
    if (wang_res.code !== 0) { alert('创建失败：' + wang_res.msg); return; }
    await wang_loadSessions();
    wang_openSession(Number(wang_res.data.wang_id));
});

wang_sendBtn.addEventListener('click', wang_send);
wang_inputBox.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); wang_send(); }
});

wang_initChat();
