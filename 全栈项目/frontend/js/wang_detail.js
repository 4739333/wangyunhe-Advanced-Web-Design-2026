/* 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* 会话详情只读页：按 URL 参数 wang_id 加载并展示全部消息 */

const wang_dArea = document.getElementById('wang_msgArea');

async function wang_dInit() {
    const wang_id = new URLSearchParams(location.search).get('wang_id');
    if (!wang_id) { wang_dArea.innerHTML = '<div class="wang_empty">缺少参数 wang_id</div>'; return; }
    const wang_res = await wang_getMessages(wang_id);
    if (wang_res.code !== 0) { wang_dArea.innerHTML = '<div class="wang_empty">' + wang_esc(wang_res.msg) + '</div>'; return; }
    const wang_s = wang_res.data.wang_session;
    let wang_html = `<div style="text-align:center;font-size:12.5px;color:#94A3B8;margin-bottom:6px">
        会话 #${wang_s.wang_id}「${wang_esc(wang_s.wang_title)}」· 创建于 ${wang_esc(wang_s.wang_created_at)} · 只读</div>`;
    wang_html += wang_res.data.wang_messages.map(m => {
        const wang_isAi = m.wang_role === 'ai';
        return `<div class="wang_msg ${wang_isAi ? 'wang_msg_ai' : 'wang_msg_user'}">
            <span class="wang_avatar"><i class="wang_ic ${wang_isAi ? 'wang_ic_star' : 'wang_ic_user'}"></i></span>
            <div><div class="wang_bubble">${wang_esc(m.wang_content)}</div>
            <div class="wang_time">${wang_isAi ? 'WangAI' : '用户'} · ${wang_hm(m.wang_created_at)}</div></div></div>`;
    }).join('');
    wang_dArea.innerHTML = wang_html;
}

wang_dInit();
