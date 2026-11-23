// 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
// 用途：把 知识库文件/ 下的两个 .docx 以 base64 JSON 上传到 POST /api/kb/upload，完成知识库构建
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wang_dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '知识库文件');
const wang_files = ['WangAI产品客服FAQ手册.docx', '高级网页设计课程考核规范.docx'];

for (const wang_name of wang_files) {
    const wang_buf = fs.readFileSync(path.join(wang_dir, wang_name));
    const wang_res = await fetch('http://localhost:416/api/kb/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wang_filename: wang_name, wang_base64: wang_buf.toString('base64') })
    });
    console.log(wang_name, '→', JSON.stringify(await wang_res.json()));
}
