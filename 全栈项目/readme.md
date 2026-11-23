# LLM 应用设计 —— WangAI 智能聊天系统

- **姓名**：王云鹤
- **学号**：24002060416
- **课程**：高级网页设计 I（大连东软信息学院）
- **项目名称**：LLM 应用设计（基础 AI 聊天）
- **项目类别**：自选

## 一、项目简介

前后端分离的全栈 AI 聊天应用：浏览器页面 → 前端 fetch 请求 `/api/*` → Express 中间层（保管密钥、拼装多轮上下文、转发大模型、SSE 流式回推）→ DeepSeek 大模型 API → SQLite 持久化会话与消息。

## 二、环境要求

- Node.js 24 及以上（数据库使用内置 `node:sqlite`，无需安装 MySQL）
- 浏览器：Chrome / Edge
- 大模型服务：DeepSeek（OpenAI 兼容接口），密钥配置在 `backend/.env`

## 三、启动步骤

1. 安装依赖：进入 `backend/` 执行 `npm install`（或 `cnpm install`）
2. 配置密钥：编辑 `backend/.env`，填入 `LLM_API_KEY`（`LLM_BASE_URL`、`LLM_MODEL` 已给出默认值）
3. 启动服务（任选其一）：
   - 双击项目根目录的 `运行项目.bat`
   - 命令行：`cd backend && node server.js`
4. 浏览器访问：`http://localhost:416`（端口 416 = 学号后三位）

首次启动会自动执行 `backend/db/wang_schema.sql` 建库建表并写入测试数据；已有旧库会自动执行增量迁移（`wang_migrate.sql` 会话扩展/新闻/图文、`wang_kb_migrate.sql` 知识库两表）。

## 四、功能清单

| 页面 | 功能 |
| --- | --- |
| `index.html` | 首页：canvas 粒子网络背景动画、姓名/学号/项目信息、全部页面导航 |
| `ai_chat.html` | AI 流式聊天：SSE 流式输出与中断、多轮上下文、Markdown/代码块渲染、消息落库与历史回放、超预算历史压缩摘要、会话新建/重命名/删除 |
| `chat.html` | 本地聊天：后端规则引擎回复（不消耗大模型额度），会话与消息同样入库 |
| `history.html` | 会话历史：按用户查看会话列表与消息数，删除会话、跳转详情 |
| `kb.html` | 知识库问答 (RAG)：上传 doc/docx/txt 原生解析分块入库、文档列表/删除、检索演示、基于知识库的 SSE 流式智能客服问答（含引用来源标签） |
| `session_detail.html` | 会话详情：只读消息回放 |
| `news.html` | 科技新闻列表：数据存于 `wang_news` 表，接口 `GET /api/news` |
| `gallery.html` | 图文列表：数据存于 `wang_gallery` 表（文生图图片），接口 `GET /api/gallery` |
| `ai_news.html` | AI 资讯列表：服务器端为 Supabase 远程 PostgreSQL（表 `wang_ai_news`，20 条模拟数据），前端原生 fetch 直连 Supabase REST 匿名只读，分类筛选 + 搜索 + 头条 + 详情弹窗；数据库信息见根目录 `database.md` |

## 五、配置项（backend/.env）

```ini
DB_USER / DB_PASSWORD / DB_HOST / DB_NAME   # SQLite 连接参数
LLM_API_KEY    # 大模型 API 密钥（勿提交到仓库）
LLM_BASE_URL   # 大模型服务地址，默认 https://api.deepseek.com
LLM_MODEL      # 模型 ID，默认 deepseek-flash
```

## 六、工程文档

- `AGENTS.md`：项目规则（命名前缀 wang_、注释规范、记录文件约定）
- `wangyunhe_prompt.md`：开发提示词记录
- `backend/wang_interface.md`：接口清单（路径、参数、响应示例）
- `backend/wang_database.md`：数据库变更记录（仅凭此文件可重建数据库）
