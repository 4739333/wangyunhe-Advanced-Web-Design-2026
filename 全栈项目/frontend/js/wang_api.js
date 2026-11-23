/* 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash */
/* fetch 封装：所有请求走 /api 前缀，数据与错误输出到控制台 */

const wang_baseUrl = '/api';

async function wang_request(wang_path, wang_method = 'GET', wang_body = null) {
    const wang_options = { method: wang_method, headers: { 'Content-Type': 'application/json' } };
    if (wang_body) wang_options.body = JSON.stringify(wang_body);
    try {
        const wang_res = await fetch(wang_baseUrl + wang_path, wang_options);
        const wang_json = await wang_res.json();
        console.log('[wang_api] ' + wang_method + wang_path + ' →', wang_json);
        return wang_json;
    } catch (wang_err) {
        console.error('[wang_api] ' + wang_method + wang_path + ' 请求失败：', wang_err);
        return { code: 9, msg: '网络错误：' + wang_err.message, data: null };
    }
}

function wang_getUsers() { return wang_request('/users'); }
function wang_getSessions(wang_userId) { return wang_request('/sessions?wang_user_id=' + wang_userId); }
function wang_createSession(wang_userId, wang_title) { return wang_request('/sessions', 'POST', { wang_user_id: wang_userId, wang_title: wang_title }); }
function wang_deleteSession(wang_id) { return wang_request('/sessions/' + wang_id, 'DELETE'); }
function wang_getMessages(wang_id) { return wang_request('/sessions/' + wang_id + '/messages'); }
function wang_sendChat(wang_sessionId, wang_content) { return wang_request('/chat', 'POST', { wang_session_id: wang_sessionId, wang_content: wang_content }); }
function wang_renameSession(wang_id, wang_title) { return wang_request('/sessions/' + wang_id, 'PUT', { wang_title: wang_title }); }
function wang_getNews() { return wang_request('/news'); }
function wang_getGallery() { return wang_request('/gallery'); }
function wang_getKbDocs() { return wang_request('/kb/docs'); }
function wang_deleteKbDoc(wang_id) { return wang_request('/kb/docs/' + wang_id, 'DELETE'); }
function wang_kbSearch(wang_query) { return wang_request('/kb/search', 'POST', { wang_query: wang_query }); }

/* 公共工具 */
function wang_esc(wang_s) {
    return String(wang_s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wang_hm(wang_dt) {
    const wang_t = String(wang_dt).slice(11, 16);
    return wang_t;
}

/* ArrayBuffer → base64（知识库文件上传用，分块避免栈溢出） */
function wang_toB64(wang_buf) {
    const wang_bytes = new Uint8Array(wang_buf);
    let wang_bin = '';
    const wang_CH = 0x8000;
    for (let i = 0; i < wang_bytes.length; i += wang_CH) {
        wang_bin += String.fromCharCode.apply(null, wang_bytes.subarray(i, i + wang_CH));
    }
    return btoa(wang_bin);
}

/* Markdown 渲染（原生手写，无第三方库；AI 聊天页与知识库问答页共用） */
function wang_md(wang_src) {
    const wang_codes = [];
    /* 1. 先摘出围栏代码块（≥3 个反引号、允许行首空格与任意长度闭合围栏），避免内部内容被后续规则破坏 */
    let wang_text = String(wang_src)
        .replace(/^([ \t]*)(`{3,})[^\n]*\n([\s\S]*?)^[ \t]*\2[ \t]*$/gm, (m, sp, fence, code) => {
            wang_codes.push({ lang: (fence.length > 3 ? 'code' : (m.match(/`{3,}\s*([\w+-]*)/) || [, 'code'])[1] || 'code'), code: code.replace(/\n$/, '') });
            return '\u0000' + (wang_codes.length - 1) + '\u0000';
        });
    /* 1b. 流式未闭合的围栏：把剩余围栏到文末全部按代码处理，防止代码文本泄露为正文 */
    wang_text = wang_text.replace(/^([ \t]*)`{3,}[^\n]*\n([\s\S]*)$/m, (m, sp, code) => {
        wang_codes.push({ lang: (m.match(/`{3,}\s*([\w+-]*)/) || [, 'code'])[1] || 'code', code: code.replace(/\n$/, '') });
        return '\u0000' + (wang_codes.length - 1) + '\u0000';
    });
    /* 2. HTML 转义 */
    wang_text = wang_esc(wang_text);
    /* 3. 行内语法：`code` / **粗体** / *斜体* / [文字](链接) */
    wang_text = wang_text
        .replace(/`([^`\n]+)`/g, '<code class="wang_md_code">$1</code>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    /* 4. 块级语法：标题 / 列表 / 分隔线 / 段落 */
    const wang_out = [];
    let wang_list = null, wang_para = [];
    const wang_closeList = () => { if (wang_list) { wang_out.push('</' + wang_list + '>'); wang_list = null; } };
    const wang_closePara = () => { if (wang_para.length) { wang_out.push('<p>' + wang_para.join('<br>') + '</p>'); wang_para = []; } };
    for (const wang_line of wang_text.split(/\r?\n/)) {
        const wang_t = wang_line.trim();
        let m;
        if (m = wang_t.match(/^(#{1,4})\s+(.*)$/)) { wang_closePara(); wang_closeList(); const lv = m[1].length + 1; wang_out.push('<h' + lv + '>' + m[2] + '</h' + lv + '>'); }
        else if (/^\u0000\d+\u0000$/.test(wang_t)) { wang_closePara(); wang_closeList(); wang_out.push(wang_t); }
        else if (m = wang_t.match(/^[-*]\s+(.*)$/)) { wang_closePara(); if (wang_list !== 'ul') { wang_closeList(); wang_out.push('<ul>'); wang_list = 'ul'; } wang_out.push('<li>' + m[1] + '</li>'); }
        else if (m = wang_t.match(/^\d+[.、]\s*(.*)$/)) { wang_closePara(); if (wang_list !== 'ol') { wang_closeList(); wang_out.push('<ol>'); wang_list = 'ol'; } wang_out.push('<li>' + m[1] + '</li>'); }
        else if (/^(-{3,}|\*{3,})$/.test(wang_t)) { wang_closePara(); wang_closeList(); wang_out.push('<hr class="wang_md_hr">'); }
        else if (wang_t === '') { wang_closePara(); wang_closeList(); }
        else { wang_closeList(); wang_para.push(wang_t); }
    }
    wang_closePara(); wang_closeList();
    /* 5. 还原代码块 */
    return wang_out.join('\n').replace(/\u0000(\d+)\u0000/g, (m, i) => {
        const b = wang_codes[+i];
        return '<pre class="wang_md_pre"><span class="wang_md_lang">' + wang_esc(b.lang) + '</span><code>' + wang_esc(b.code) + '</code></pre>';
    });
}
