// 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// Controller 层：接口业务逻辑（含本地模拟 AI 回复引擎）
import * as wang_model from '../models/wang_chatModel.js';

// 统一响应包装
function wang_res(wang_code, wang_msg, wang_data) {
    return { code: wang_code, msg: wang_msg, data: wang_data };
}

// 本地模拟 AI：按关键词匹配回复库，未命中则随机兜底
const wang_rules = [
    { kw: ['你好', 'hi', 'hello'], reply: '你好！我是王云鹤开发的本地 AI 助手，有什么可以帮你的？' },
    { kw: ['时间', '几点'], reply: () => '现在是 ' + new Date().toLocaleString('zh-CN') + '。' },
    { kw: ['作业', '题'], reply: '把题目完整发给我，我会给出解题步骤和思路提示。' },
    { kw: ['代码', 'bug', '报错'], reply: '贴出报错信息和相关代码，我帮你逐行定位问题。' },
    { kw: ['推荐'], reply: '推荐先看《代码整洁之道》，实践里多写小项目巩固，进步最快。' },
    { kw: ['天气'], reply: '我暂时不能联网查天气，但你可以告诉我城市，我帮你规划穿衣建议。' },
    { kw: ['笑话'], reply: '为什么程序员分不清万圣节和圣诞节？因为 Oct 31 == Dec 25。' },
    { kw: ['谢谢', '感谢'], reply: '不客气！有需要随时找我聊天。' },
    { kw: ['你是谁'], reply: '我是本课设项目里的模拟 AI 聊天助手，运行在 Node.js + SQLite 之上。' }
];
const wang_fallback = [
    '这个问题很有意思，能再具体说说你的场景吗？',
    '我记下了，你可以补充一些细节，我再帮你分析。',
    '从工程角度建议：先拆成小步骤，逐个验证再组合。',
    '本地模型知识有限，不过我可以帮你梳理思路。'
];

function wang_aiReply(wang_text) {
    const wang_lower = wang_text.toLowerCase();
    for (const wang_r of wang_rules) {
        if (wang_r.kw.some(k => wang_lower.includes(k))) {
            return typeof wang_r.reply === 'function' ? wang_r.reply() : wang_r.reply;
        }
    }
    return wang_fallback[Math.floor(Math.random() * wang_fallback.length)];
}

/* ---------- 用户 ---------- */
export function wang_apiUsers(req, res) {
    res.json(wang_res(0, '获取成功', wang_model.wang_listUsers()));
}

export function wang_apiAddUser(req, res) {
    const { wang_name, wang_account } = req.body || {};
    if (!wang_name || !wang_account) return res.json(wang_res(1, 'wang_name 与 wang_account 必填', {}));
    try {
        const wang_id = wang_model.wang_addUser(String(wang_name), String(wang_account));
        res.json(wang_res(0, '用户创建成功', { wang_id }));
    } catch (e) {
        res.json(wang_res(2, '账号已存在或写入失败：' + e.message, {}));
    }
}

/* ---------- 会话 ---------- */
export function wang_apiSessions(req, res) {
    const wang_userId = Number(req.query.wang_user_id || 0);
    if (!wang_userId) return res.json(wang_res(1, '缺少参数 wang_user_id', {}));
    res.json(wang_res(0, '获取成功', wang_model.wang_listSessions(wang_userId)));
}

export function wang_apiAddSession(req, res) {
    const { wang_user_id, wang_title } = req.body || {};
    if (!wang_user_id) return res.json(wang_res(1, '缺少 wang_user_id', {}));
    const wang_id = wang_model.wang_addSession(Number(wang_user_id), String(wang_title || '新会话'));
    res.json(wang_res(0, '会话已创建', { wang_id }));
}

export function wang_apiDeleteSession(req, res) {
    const wang_ok = wang_model.wang_deleteSession(Number(req.params.wang_id));
    res.json(wang_ok ? wang_res(0, '会话及消息已删除', {}) : wang_res(3, '会话不存在', {}));
}

export function wang_apiRenameSession(req, res) {
    const wang_title = String((req.body || {}).wang_title || '').trim();
    if (!wang_title) return res.json(wang_res(1, '缺少参数 wang_title', {}));
    const wang_ok = wang_model.wang_renameSession(Number(req.params.wang_id), wang_title.slice(0, 50));
    res.json(wang_ok ? wang_res(0, '会话已重命名', {}) : wang_res(3, '会话不存在', {}));
}

/* ---------- 科技新闻 / 图文展示 ---------- */
export function wang_apiNews(req, res) {
    res.json(wang_res(0, '获取成功', wang_model.wang_listNews()));
}

export function wang_apiGallery(req, res) {
    res.json(wang_res(0, '获取成功', wang_model.wang_listGallery()));
}

/* ---------- 消息与聊天 ---------- */
export function wang_apiMessages(req, res) {
    const wang_session = wang_model.wang_getSession(Number(req.params.wang_id));
    if (!wang_session) return res.json(wang_res(3, '会话不存在', {}));
    res.json(wang_res(0, '获取成功', { wang_session, wang_messages: wang_model.wang_listMessages(wang_session.wang_id) }));
}

export function wang_apiChat(req, res) {
    const { wang_session_id, wang_content } = req.body || {};
    if (!wang_session_id || !String(wang_content || '').trim()) {
        return res.json(wang_res(1, 'wang_session_id 与 wang_content 必填', {}));
    }
    const wang_session = wang_model.wang_getSession(Number(wang_session_id));
    if (!wang_session) return res.json(wang_res(3, '会话不存在', {}));

    const wang_text = String(wang_content).trim();
    const wang_userMsgId = wang_model.wang_addMessage(wang_session.wang_id, 'user', wang_text);
    const wang_aiMsgId = wang_model.wang_addMessage(wang_session.wang_id, 'ai', wang_aiReply(wang_text));

    res.json(wang_res(0, '发送成功', {
        wang_user_msg: wang_model.wang_listMessages(wang_session.wang_id).find(m => m.wang_id === Number(wang_userMsgId)),
        wang_ai_msg:   wang_model.wang_listMessages(wang_session.wang_id).find(m => m.wang_id === Number(wang_aiMsgId))
    }));
}
