// 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// Router 层：/api 前缀路由注册（RESTful）
import { Router } from 'express';
import * as wang_ctrl from '../controllers/wang_chatController.js';
import { wang_apiAiChat, wang_apiAiChatStream } from '../controllers/wang_aiController.js';
import * as wang_kb_ctrl from '../controllers/wang_kbController.js';
import { wang_apiReviewClassify } from '../controllers/wang_reviewController.js';

const wang_router = Router();

wang_router.get('/users', wang_ctrl.wang_apiUsers);
wang_router.post('/users', wang_ctrl.wang_apiAddUser);

wang_router.get('/sessions', wang_ctrl.wang_apiSessions);
wang_router.post('/sessions', wang_ctrl.wang_apiAddSession);
wang_router.put('/sessions/:wang_id', wang_ctrl.wang_apiRenameSession);
wang_router.delete('/sessions/:wang_id', wang_ctrl.wang_apiDeleteSession);

wang_router.get('/sessions/:wang_id/messages', wang_ctrl.wang_apiMessages);
wang_router.post('/chat', wang_ctrl.wang_apiChat);

wang_router.get('/news', wang_ctrl.wang_apiNews);
wang_router.get('/gallery', wang_ctrl.wang_apiGallery);

wang_router.post('/ai/chat', wang_apiAiChat);
wang_router.post('/ai/chat/stream', wang_apiAiChatStream);

wang_router.post('/kb/upload', wang_kb_ctrl.wang_apiKbUpload);
wang_router.get('/kb/docs', wang_kb_ctrl.wang_apiKbDocs);
wang_router.delete('/kb/docs/:wang_id', wang_kb_ctrl.wang_apiKbDelete);
wang_router.post('/kb/search', wang_kb_ctrl.wang_apiKbSearch);
wang_router.post('/kb/chat/stream', wang_kb_ctrl.wang_apiKbChatStream);

wang_router.post('/review/classify', wang_apiReviewClassify);

export default wang_router;
