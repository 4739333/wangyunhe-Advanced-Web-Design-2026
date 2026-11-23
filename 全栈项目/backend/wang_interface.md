# 接口记录（wang_interface.md · 追加写入，禁止覆盖）

姓名：王云鹤 | 学号：0416 | 大模型：Qwen3.8-Flash
基础地址：http://localhost:416/api （端口 = 学号 0416 后三位）
统一响应格式：{ "code": 0, "msg": "提示信息", "data": {...} }，code=0 成功、非 0 失败。

---

## 2026-11-12

### GET /api/users
- 请求参数：无
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": [ { "wang_id": 1, "wang_name": "王云鹤", "wang_account": "wyh0416", "wang_avatar": "user", "wang_created_at": "2026-11-12 10:00:00" } ] }
```

### POST /api/users
- 请求体：`{ "wang_name": "新同学", "wang_account": "xinx" }`
- 响应示例：`{ "code": 0, "msg": "用户创建成功", "data": { "wang_id": 9 } }`
- 失败：code=1 参数缺失；code=2 账号重复

### GET /api/sessions?wang_user_id=1
- 请求参数：query `wang_user_id`（必填）
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": [ { "wang_id": 2, "wang_user_id": 1, "wang_title": "写周报思路", "wang_created_at": "...", "wang_msg_count": 2 } ] }
```

### POST /api/sessions
- 请求体：`{ "wang_user_id": 1, "wang_title": "新会话" }`（wang_title 可省略，默认"新会话"）
- 响应示例：`{ "code": 0, "msg": "会话已创建", "data": { "wang_id": 9 } }`

### DELETE /api/sessions/:wang_id
- 路径参数：wang_id
- 响应示例：`{ "code": 0, "msg": "会话及消息已删除", "data": {} }`；不存在时 code=3
- 级联删除该会话全部消息

### GET /api/sessions/:wang_id/messages
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": { "wang_session": { "wang_id": 1, "wang_user_id": 1, "wang_title": "问作业题" },
            "wang_messages": [ { "wang_id": 1, "wang_session_id": 1, "wang_role": "user", "wang_content": "这道高数极限题怎么求？", "wang_created_at": "..." } ] } }
```

### POST /api/chat
- 请求体：`{ "wang_session_id": 1, "wang_content": "你好" }`
- 行为：保存用户消息 → 本地规则引擎生成 AI 回复并保存
- 响应示例：
```json
{ "code": 0, "msg": "发送成功",
  "data": { "wang_user_msg": { "wang_id": 17, "wang_role": "user", "wang_content": "你好" },
            "wang_ai_msg":   { "wang_id": 18, "wang_role": "ai", "wang_content": "你好！我是王云鹤开发的本地 AI 助手，有什么可以帮你的？" } } }
```

---

## 2026-11-12（新增 DeepSeek 大模型代理接口）

### POST /api/ai/chat
- 请求体：`{ "wang_messages": [ { "role": "system"|"user"|"assistant", "content": "..." } ] }`（OpenAI messages 格式，含历史上下文）
- 行为：后端读取 .env 中 DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL(deepseek-flash)，POST 到 https://api.deepseek.com/v1/chat/completions，收发数据打印服务端控制台
- 响应示例：
``json
{ "code": 0, "msg": "回答成功",
  "data": { "wang_reply": "你好！我是……", "wang_model": "deepseek-flash",
            "wang_usage": { "prompt_tokens": 60, "completion_tokens": 25, "total_tokens": 85 }, "wang_ms": 1234 } }
``
- 失败：code=1 缺 wang_messages；code=2 未配置密钥；code=3 大模型返回 HTTP 错误（msg 含原因）；code=4 网络异常

---

## 2026-11-12（按 LLM 应用设计实验指导书扩展）

> 配置变更：.env 变量名由 DEEPSEEK_* 改为指导书约定的 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`。

### PUT /api/sessions/:wang_id（会话重命名）
- 请求体：`{ "wang_title": "新的会话名" }`（最长 50 字）
- 响应示例：`{ "code": 0, "msg": "会话已重命名", "data": {} }`；code=1 缺参数；code=3 会话不存在

### GET /api/news（科技新闻列表）
- 数据来源：wang_news 表（8 条测试数据），按发布日期倒序
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": [ { "wang_id": 1, "wang_title": "国产大模型密集开源，推理成本再降一个数量级", "wang_source": "36氪",
              "wang_tag": "大模型", "wang_summary": "……", "wang_url": "https://www.36kr.com",
              "wang_pub_date": "2026-11-10", "wang_created_at": "..." } ] }
```

### GET /api/gallery（图文展示列表）
- 数据来源：wang_gallery 表（8 条，wang_image 为文生图服务 URL）
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": [ { "wang_id": 1, "wang_title": "神经网络之光", "wang_category": "AI视觉",
              "wang_description": "……", "wang_image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=...",
              "wang_author": "王云鹤", "wang_created_at": "..." } ] }
```

### POST /api/ai/chat/stream（SSE 流式对话，核心接口）
- 请求体：`{ "wang_session_id": 1, "wang_content": "用户输入" }`
- 行为：
  1. 用户消息落库 wang_messages；
  2. 读取压缩水位线（wang_sessions.wang_compressed_id）之后的历史消息；
  3. 保留最近 6 条原文，更早消息总字数超过 1600 时调用大模型压缩为摘要，写入 wang_sessions.wang_summary 并推进水位线；
  4. 拼装 messages（system 提示词 + 摘要 + 最近原文），以 stream:true 转发大模型；
  5. 以 `Content-Type: text/event-stream` 逐块推送增量；
  6. 完整回复（或前端中断后的部分回复）落库；请求体与接收数据全部打印服务端控制台。
- 事件格式（每条一行 `data: {...}`）：
  - 增量：`data: {"wang_delta":"文本片段"}`
  - 结束：`data: {"wang_done":true,"wang_ai_msg_id":123,"wang_ms":2345}`
  - 错误：`data: {"wang_error":"失败原因"}`
- 前端中断：浏览器 fetch AbortController.abort() → 后端感知连接关闭 → 中止上游请求并保存已生成部分。
- 参数/会话错误仍以普通 JSON 返回（HTTP 400，统一 {code,msg,data}）。

---

## 2026-11-12（RAG 知识库接口）

> 文件以 JSON base64 上传（避免 multipart 依赖）；docx 用原生 zip+inflate 解析，doc 二进制启发式提取，txt UTF-8/GBK 自适应；分块约 380 字；检索为中文二元组+英文词的 TF 打分（无第三方库）。

### POST /api/kb/upload（知识库文件上传解析）
- 请求体：`{ "wang_filename": "手册.docx", "wang_base64": "<文件内容 base64>" }`
- 行为：校验扩展名（doc/docx/txt）→ 解析文本 → 分块 → 写入 wang_kb_docs / wang_kb_chunks
- 响应示例：
```json
{ "code": 0, "msg": "上传并解析成功",
  "data": { "wang_doc_id": 1, "wang_filename": "手册.docx", "wang_filetype": "docx",
            "wang_filesize": 2325, "wang_chunks": 3, "wang_chars": 861 } }
```
- 失败：code=1 缺参数；code=2 扩展名不支持；code=3 base64 解码失败；code=4 解析失败；code=5 未解析出文本

### GET /api/kb/docs（知识库文档列表）
- 响应示例：
```json
{ "code": 0, "msg": "获取成功",
  "data": [ { "wang_id": 1, "wang_filename": "WangAI产品客服FAQ手册.docx", "wang_filetype": "docx",
              "wang_filesize": 2325, "wang_chunks": 3, "wang_status": "ok", "wang_created_at": "..." } ] }
```

### DELETE /api/kb/docs/:wang_id（删除文档）
- 级联删除该文档全部分块；不存在时 code=3
- 响应示例：`{ "code": 0, "msg": "文档及其分块已删除", "data": {} }`

### POST /api/kb/search（检索演示）
- 请求体：`{ "wang_query": "退货政策是什么" }`
- 响应示例：
```json
{ "code": 0, "msg": "检索完成",
  "data": { "wang_query": "退货政策是什么",
            "wang_hits": [ { "wang_doc_id": 1, "wang_filename": "WangAI产品客服FAQ手册.docx",
                             "wang_seq": 2, "wang_content": "……7天无理由退货……", "wang_score": 4.213 } ] } }
```
- 命中规则：按 TF 得分倒序，最多返回 4 块

### POST /api/kb/chat/stream（RAG 智能客服 SSE 流式问答，核心接口）
- 请求体：`{ "wang_content": "客服工作时间是什么时候？" }`
- 行为：检索知识库 top4 → 命中块以【资料N｜来源：文件名 第N块】注入 system 提示词（约束只依据资料作答、不得编造）→ stream:true 转发大模型 → SSE 逐块推送；问答不落库（演示性质）；请求体、命中明细、发送/接收数据全部打印服务端控制台。
- 事件格式：增量 `data: {"wang_delta":"…"}`；结束 `data: {"wang_done":true,"wang_refs":[{"wang_filename":"…","wang_seq":1,"wang_score":3.2}],"wang_ms":1234}`；错误 `data: {"wang_error":"…"}`
- 前端把 wang_refs 渲染为回答下方的引用来源标签。
- 参数/密钥错误以普通 JSON 返回（HTTP 400，统一 {code,msg,data}）。

---

## 2026-11-17

### POST /api/review/classify（商业评论情感分类，核心接口）
- 请求体：`{ "wang_filename": "模拟评论数据_餐厅.xlsx", "wang_base64": "<xlsx 文件 base64>" }`（前端 FileReader 转 base64）
- 行为：后端原生解析 xlsx（zip 中央目录定位 + inflateRaw 解 sheet1.xml，支持 sharedStrings 与 inlineStr 两种单元格）→ 自动识别评论列（表头含"评论/内容/评价"，否则取平均字数最长文本列）→ 一次 LLM 请求批量分类（temperature 0，输出"编号|好评/中评/差评"，解析容错，缺失按中评兜底）；发送给大模型与从大模型接收的原始数据全部打印服务端控制台。
- 模拟数据：全栈项目目录 `模拟评论数据_餐厅.xlsx` / `模拟评论数据_电商.xlsx` / `模拟评论数据_酒店.xlsx` / `模拟评论数据_电影.xlsx`（各 20 条，由 `backend/tools/wang_gen_reviews.js` 原生生成）
- 响应示例：
```json
{ "code": 0, "msg": "分类成功",
  "data": { "wang_filename": "模拟评论数据_餐厅.xlsx", "wang_total": 20,
            "wang_results": [ { "wang_index": 1, "wang_review": "环境优雅，招牌黑椒牛排…", "wang_sentiment": "好评" } ],
            "wang_summary": { "好评": 8, "中评": 6, "差评": 6 },
            "wang_model": "deepseek-flash", "wang_ms": 4321 } }
```
- 错误码：1 缺参数；2 非 xlsx；3 base64 解码失败；4 解析失败；5 未解析出评论；6 大模型服务错误；7 调用大模型异常。
- 前端 `review.html`：接收 wang_results 后原生 canvas 绘制饼状图（好评 #34D399 / 中评 #FBBF24 / 差评 #F87171 + 百分比 + 图例），每类精选字数最多的 2 条展示；请求与响应数据打印浏览器控制台。

## 2026-11-23

### POST /api/review/classify（接口保留，全栈项目前端页面下线）
- 变更：全栈项目前端 review.html / js/wang_review.js 已删除，各页面导航"评论情感分类"链接、index 入口卡片与接口清单行同步移除；全栈项目根目录 4 个模拟数据 xlsx 与 backend/tools/wang_gen_reviews.js 已删除。
- 接口本身保留并继续可用：四级项目页面"四级项目/商业评论情感分类/index.html"依赖 http://localhost:416/api/review/classify 作为大模型分类后端（后端已放开跨域，直接可用）。
- 请求/响应格式与错误码维持 2026-11-17 记录不变；模拟数据改由"四级项目/商业评论情感分类/"目录下 3 个 xlsx（各 20 条）提供。
