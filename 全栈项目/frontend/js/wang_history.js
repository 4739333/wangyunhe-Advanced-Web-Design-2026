/* 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* 会话历史页逻辑：列表展示、删除会话、跳转详情 */

const wang_hUserSelect = document.getElementById('wang_userSelect');
const wang_hTbody = document.getElementById('wang_tbody');
const wang_hTip = document.getElementById('wang_tip');

function wang_showTip(wang_text) {
    wang_hTip.textContent = wang_text;
    wang_hTip.style.display = 'block';
    setTimeout(() => { wang_hTip.style.display = 'none'; }, 2600);
}

async function wang_hInit() {
    const wang_res = await wang_getUsers();
    if (wang_res.code !== 0) { wang_hTbody.innerHTML = '<tr><td colspan="5">' + wang_esc(wang_res.msg) + '</td></tr>'; return; }
    wang_hUserSelect.innerHTML = wang_res.data.map(u =>
        `<option value="${u.wang_id}">${wang_esc(u.wang_name)}（${wang_esc(u.wang_account)}）</option>`).join('');
    wang_hLoad();
}

async function wang_hLoad() {
    const wang_res = await wang_getSessions(Number(wang_hUserSelect.value));
    if (wang_res.code !== 0) { wang_hTbody.innerHTML = '<tr><td colspan="5">' + wang_esc(wang_res.msg) + '</td></tr>'; return; }
    if (!wang_res.data.length) { wang_hTbody.innerHTML = '<tr><td colspan="5" style="color:#94A3B8">该用户还没有会话</td></tr>'; return; }
    wang_hTbody.innerHTML = wang_res.data.map(s => `<tr>
        <td>${s.wang_id}</td>
        <td>${wang_esc(s.wang_title)}</td>
        <td><span class="wang_badge">${s.wang_msg_count} 条</span></td>
        <td>${wang_esc(s.wang_created_at)}</td>
        <td><div class="wang_row_btns">
            <button class="wang_btn wang_btn_ghost" data-act="detail" data-id="${s.wang_id}">查看详情</button>
            <button class="wang_btn wang_btn_danger" data-act="del" data-id="${s.wang_id}">删除</button>
        </div></td></tr>`).join('');
}

wang_hUserSelect.addEventListener('change', wang_hLoad);
document.getElementById('wang_refreshBtn').addEventListener('click', wang_hLoad);

wang_hTbody.addEventListener('click', async e => {
    const wang_btn = e.target.closest('button[data-act]');
    if (!wang_btn) return;
    const wang_id = Number(wang_btn.dataset.id);
    if (wang_btn.dataset.act === 'detail') {
        location.href = 'session_detail.html?wang_id=' + wang_id;
        return;
    }
    if (!confirm('确定删除会话 #' + wang_id + ' 及其全部消息？')) return;
    const wang_res = await wang_deleteSession(wang_id);
    if (wang_res.code === 0) { wang_showTip('会话 #' + wang_id + ' 已删除'); wang_hLoad(); }
    else wang_showTip('删除失败：' + wang_res.msg);
});

wang_hInit();
