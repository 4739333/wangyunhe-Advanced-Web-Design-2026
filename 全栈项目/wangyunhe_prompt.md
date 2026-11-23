# 开发指令记录（追加写入，禁止覆盖）

## 2026-11-12 | 大模型：Qwen3.8-Flash

- 提示词：完成全栈项目要求（依据 全栈项目/全栈提示词.docx）：创建 AGENTS.md 规则；前端原生三件套 wang_ 前缀；后端 Node.js + Express，端口 416，/api 前缀，托管 frontend，全跨域；数据库二选一（选定 SQLite），每表至少 8 条真实业务测试数据；凭据入 .env 并 gitignore；追加记录 wangyunhe_prompt.md / wang_interface.md / wang_database.md；统一 JSON 响应 {code,msg,data}；数据与错误输出控制台；新页面入 index 入口（detail 除外）。业务主题由 AI 自定（选定：图书借阅管理）。

## 2026-11-12-16-02 | 大模型：Qwen3.8-Flash
- 提示词：不是图书借阅管理是AI聊天，继续

## 2026-11-12-16-13 | 大模型：Qwen3.8-Flash
- 提示词：创建AI聊天页面。Model ID: deepseek-flash；OpenAI BaseURL: https://api.deepseek.com；在控制台里输出发送给大模型的数据和从大模型接收到的数据。

## 2026-11-12-16-19 | 大模型：Qwen3.8-Flash
- 提示词：用户提供新 DeepSeek 密钥（sk-7591…a206，脱敏，完整值仅存 backend/.env）

## 2026-11-12-16-26 | 大模型：Qwen3.8-Flash
- 提示词：按 初始化项目.txt 重构首页（canvas 背景动画、姓名王云鹤、完整学号 24002060416、项目名称、类别自选、全部页面超链接），创建根目录 readme.md 与运行 bat，完成科技新闻列表页与图文列表页（数据入库、显示接口与数据内容）；并按 LLM应用设计-实验指导书.md 完成基础 AI 聊天：多轮上下文、消息落库与历史回放、超预算历史压缩摘要写会话表、SSE 流式输出与前端中断、Markdown/代码块渲染、会话重命名、收发数据控制台输出、页面跳转不超过两次点击、.env 变量名改 LLM_API_KEY/LLM_BASE_URL/LLM_MODEL。

## 2026-11-12-16-47 | 大模型：Qwen3.8-Flash
- 提示词：完成知识库文件上传功能（RAG）：支持 doc/docx（及 txt）上传解析入库，构建 2 个知识库文件，基于知识库的流式问答（专属自动客服/问答系统），知识库管理（列表/删除），收发数据打开控制台输出。

## 2026-11-12-17-03 | 大模型：Qwen3.8-Flash
- 提示词：加入 ui-ux-pro-max skill（用户上传的 zip 包），并让全栈项目的 UI 界面按照该 skill 的设计智能进行重新设计。

## 2026-11-12-17-05 | 大模型：Qwen3.8-Flash
- 提示词：执行：安装 skill 到全局目录，并按 ui-ux-pro-max 工作流（--design-system 生成设计系统 → 应用到前端页面样式与交互）。

## 2026-11-17-17-51 | 大模型：Qwen3.8-Flash
- 提示词：完成商业评论情感分类功能：用户上传 Excel（若干商业评论），LLM 对每条评论分类为好评/中评/差评，前端接收返回数据绘制饼状图并显示精选评论；生成 3 个 Excel 模拟数据文件（各 20 条）放根目录；大模型收发数据在控制台显示。

## 2026-11-23-16-53 | 大模型：GLM-5.3-Flash
- 提示词：完成一个ai新闻列表功能，服务器端使用supabase，通过mcp操控supabase，只修改frontend目录，不修改backend目录，cdn文件下载到本地，需要建表，表里有20条有意义的模拟数据，所有数据库信息写在根目录的database.md文件里。

## 2026-11-23-18-02 | 大模型：GLM-5.3-Flash
- 提示词：把wangai聊天的评论情感分类删了（保留后端 /api/review/classify 供四级项目页面调用，删除前端页面、导航、入口、模拟数据与生成器）。
