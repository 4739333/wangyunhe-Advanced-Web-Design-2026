// 姓名：王云鹤 | 学号：0416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// 入口：Express 服务，端口 416（学号后三位），托管 frontend，支持所有跨域
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import wang_router from './routes/wang_routes.js';
import './db/wang_db.js';

const wang_app = express();
const wang_dir = path.dirname(fileURLToPath(import.meta.url));

wang_app.use(cors());                    // 允许所有来源跨域
wang_app.use(express.json({ limit: '20mb' })); // 解析 JSON 请求体（知识库文件以 base64 上传，需较大上限）
wang_app.use(express.static(path.join(wang_dir, '..', 'frontend'))); // 托管前端
wang_app.use('/api', wang_router);       // 所有接口以 /api 为前缀

const wang_port = 416;
wang_app.listen(wang_port, () => {
    console.log(`[wang_server] AI 聊天后端已启动: http://localhost:${wang_port}`);
});
