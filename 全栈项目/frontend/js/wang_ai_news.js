/* 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-23 | 大模型：GLM-5.3-Flash */
/* AI 资讯列表前端逻辑（数据源：Supabase 远程 PostgreSQL）
   1. 原生 fetch 直连 Supabase REST API（匿名只读，RLS 限制为 select），无任何第三方库
   2. 请求 URL / 响应数据全部打印浏览器控制台
   3. 分类筛选 + 关键词搜索 + 头条展示 + 详情弹窗，全部客户端渲染 */

/* ---------- Supabase 连接信息（publishable key 可公开，详见 database.md） ---------- */
const wang_sbUrl = 'https://rimojqybhwaciigumezw.supabase.co';
const wang_sbKey = 'sb_publishable_apgAlLBxucRQ8zE6a6KQSQ_ovSBSRc4';
const wang_sbTable = 'wang_ai_news';

/* 分类配色 */
const wang_catColors = {
    '大模型': '#60A5FA', '行业应用': '#34D399', '芯片硬件': '#F472B6',
    '政策监管': '#FBBF24', '开源生态': '#A78BFA', '投融资': '#F87171',
    '具身智能': '#22D3EE'
};
const wang_catColor = c => wang_catColors[c] || '#94A3B8';

let wang_cache = [];            // 全量数据缓存
let wang_activeCat = '全部';     // 当前分类
let wang_keyword = '';          // 当前关键词

/* ---------- 工具 ---------- */
function wang_esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function wang_fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
const wang_chipHtml = c => `<span class="wang_n_chip" style="color:${wang_catColor(c)};background:${wang_catColor(c)}22">${wang_esc(c)}</span>`;

/* ---------- 拉取数据（原生 fetch → Supabase REST） ---------- */
async function wang_loadNews() {
    const wang_tip = document.getElementById('wang_nTip');
    wang_tip.textContent = '正在从 Supabase 加载新闻…';
    /* PostgREST 查询：全列 + 按 wang_published_at 倒序 */
    const wang_url = `${wang_sbUrl}/rest/v1/${wang_sbTable}?select=*&order=wang_published_at.desc`;
    console.log('[wang_ai_news] → 发送给 Supabase 的 REST 请求：', wang_url);

    try {
        const wang_res = await fetch(wang_url, {
            headers: {
                'apikey': wang_sbKey,                          // PostgREST 匿名鉴权
                'Authorization': 'Bearer ' + wang_sbKey,
                'Accept': 'application/json'
            }
        });
        const wang_data = await wang_res.json();
        console.log(`[wang_ai_news] ← Supabase 返回数据（HTTP ${wang_res.status}，共 ${Array.isArray(wang_data) ? wang_data.length : 0} 条）：`, wang_data);
        if (!wang_res.ok) throw new Error('Supabase 返回 HTTP ' + wang_res.status + '：' + JSON.stringify(wang_data));
        if (!Array.isArray(wang_data)) throw new Error('Supabase 返回格式异常');

        wang_cache = wang_data;
        wang_tip.textContent = `加载完成：${wang_data.length} 条新闻（${new Date().toLocaleTimeString()}）`;
        wang_render();
    } catch (wang_e) {
        console.error('[wang_ai_news] 加载失败：', wang_e);
        wang_tip.textContent = '加载失败：' + wang_e.message;
    }
}

/* ---------- 渲染 ---------- */
function wang_render() {
    /* 统计 */
    const wang_cats = [...new Set(wang_cache.map(n => n.wang_category))];
    document.getElementById('wang_nTotal').textContent = wang_cache.length;
    document.getElementById('wang_nCats').textContent = wang_cats.length;
    document.getElementById('wang_nLatest').textContent = wang_cache.length ? wang_fmtTime(wang_cache[0].wang_published_at).slice(5) : '-';

    /* 分类筛选条 */
    document.getElementById('wang_nChips').innerHTML = ['全部'].concat(wang_cats).map(c =>
        `<button class="wang_n_chipBtn${c === wang_activeCat ? ' wang_n_on' : ''}" data-cat="${wang_esc(c)}">${wang_esc(c)}</button>`).join('');

    /* 头条：取标记为头条的第一条（不受筛选影响） */
    const wang_feat = wang_cache.find(n => n.wang_is_featured);
    document.getElementById('wang_nFeatBox').innerHTML = wang_feat ? `
        <article class="wang_n_feat wang_card">
            <img class="wang_n_featImg" src="${wang_esc(wang_feat.wang_image_url)}" alt="${wang_esc(wang_feat.wang_title)}" loading="lazy"
                 onerror="this.style.display='none'">
            <div>
                <span class="wang_n_featTag">头条</span>
                <h2 onclick="wang_openDetail(${wang_feat.wang_id})">${wang_esc(wang_feat.wang_title)}</h2>
                <p class="wang_n_sum">${wang_esc(wang_feat.wang_summary)}</p>
                <div class="wang_n_meta">
                    ${wang_chipHtml(wang_feat.wang_category)}
                    <time>${wang_fmtTime(wang_feat.wang_published_at)}</time>
                    <span style="font-size:12px;color:var(--wang_muted_fg)">来源：${wang_esc(wang_feat.wang_source)}</span>
                </div>
            </div>
        </article>` : '';

    /* 列表：应用分类 + 关键词筛选 */
    const wang_kw = wang_keyword.trim().toLowerCase();
    const wang_list = wang_cache.filter(n =>
        (wang_activeCat === '全部' || n.wang_category === wang_activeCat) &&
        (!wang_kw || (n.wang_title + n.wang_summary + n.wang_content).toLowerCase().includes(wang_kw)));
    document.getElementById('wang_nEmpty').hidden = wang_list.length > 0;
    document.getElementById('wang_nGrid').innerHTML = wang_list.map(n => `
        <article class="wang_n_card wang_card" onclick="wang_openDetail(${n.wang_id})">
            ${n.wang_image_url ? `<img class="wang_n_cardImg" src="${wang_esc(n.wang_image_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
            <div class="wang_n_head">${wang_chipHtml(n.wang_category)}<time>${wang_fmtTime(n.wang_published_at)}</time></div>
            <h3>${wang_esc(n.wang_title)}</h3>
            <p>${wang_esc(n.wang_summary)}</p>
            <div class="wang_n_foot"><span>来源：${wang_esc(n.wang_source)}</span><button class="wang_n_more">阅读全文 →</button></div>
        </article>`).join('');
}

/* ---------- 详情弹窗 ---------- */
function wang_openDetail(wang_id) {
    const wang_n = wang_cache.find(x => x.wang_id === wang_id);
    if (!wang_n) return;
    console.log('[wang_ai_news] 查看详情（本地渲染，无额外请求）：', wang_n.wang_id, wang_n.wang_title);
    document.getElementById('wang_nModalBody').innerHTML = `
        <div class="wang_n_meta">${wang_chipHtml(wang_n.wang_category)}<time>${wang_fmtTime(wang_n.wang_published_at)}</time><span style="font-size:12px;color:var(--wang_muted_fg)">来源：${wang_esc(wang_n.wang_source)}</span></div>
        <h2>${wang_esc(wang_n.wang_title)}</h2>
        <div class="wang_n_body">${wang_esc(wang_n.wang_content)}</div>`;
    document.getElementById('wang_nMask').classList.add('wang_n_show');
}

/* ---------- 事件绑定 ---------- */
document.getElementById('wang_nChips').addEventListener('click', e => {
    const wang_btn = e.target.closest('[data-cat]');
    if (!wang_btn) return;
    wang_activeCat = wang_btn.dataset.cat;
    wang_render();
});
document.getElementById('wang_nKeyword').addEventListener('input', e => {
    wang_keyword = e.target.value;
    wang_render();
});
document.getElementById('wang_nRefresh').addEventListener('click', wang_loadNews);
document.getElementById('wang_nClose').addEventListener('click', () =>
    document.getElementById('wang_nMask').classList.remove('wang_n_show'));
document.getElementById('wang_nMask').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('wang_n_show');
});

/* 首次加载 */
wang_loadNews();
