-- 姓名：王云鹤 | 学号：24002060416 | 时间：2026-11-12 | 大模型：Qwen3.8-Flash
-- 增量迁移脚本：为已存在的旧库补建 wang_news / wang_gallery 两表及测试数据
-- （全新数据库由 wang_schema.sql 一次性建全，不会执行本文件）

CREATE TABLE IF NOT EXISTS wang_news (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_title       TEXT NOT NULL,
    wang_source      TEXT NOT NULL,
    wang_tag         TEXT NOT NULL,
    wang_summary     TEXT NOT NULL,
    wang_url         TEXT NOT NULL,
    wang_pub_date    TEXT NOT NULL,
    wang_created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

INSERT INTO wang_news (wang_title, wang_source, wang_tag, wang_summary, wang_url, wang_pub_date) VALUES
 ('国产大模型密集开源，推理成本再降一个数量级', '36氪', '大模型',
  '多家国内团队相继开源新一代 MoE 架构模型，以更低显存占用实现接近旗舰级的推理能力，开发者本地部署门槛大幅下降。', 'https://www.36kr.com', '2026-11-10'),
 ('MCP 协议成为 AI 工具调用事实标准，主流模型全面接入', '机器之心', 'AI生态',
  'Model Context Protocol 已被多家模型厂商与 IDE 厂商采纳，AI 应用连接外部工具、数据源的碎片化生态正走向统一。', 'https://www.jiqizhixin.com', '2026-11-08'),
 ('Node.js 24 长期支持版发布：内置测试框架与权限模型成熟', 'InfoQ', '后端开发',
  'v24 将稳定的权限控制、原生测试运行器与 SQLite 模块带入 LTS，零依赖后端原型开发成为社区热议方向。', 'https://www.infoq.cn', '2026-11-05'),
 ('AI 辅助编程进入高校课堂，Vibe Coding 成为新课主题', 'CSDN', '教育',
  '多所高校在网页设计、全栈开发课程中引入 AI 结对编程工作流，强调需求拆解、提示词工程与调试验证的完整工程能力。', 'https://www.csdn.net', '2026-11-03'),
 ('硅基流动等平台提供免费算力，学生开发者低成本接入大模型', '量子位', '云计算',
  '多家推理云平台面向教育场景开放免费额度与校园认证通道，课程项目可直接调用 DeepSeek、Qwen 等主流模型 API。', 'https://www.qbitai.com', '2026-10-30'),
 ('浏览器原生 SQLite 落地，Web 应用本地数据层迎来 rewrite', '开源中国', '前端',
  'Chromium 实验性内置 SQLite 模块，配合 OPFS 存储，离线优先的复杂 Web 应用不再依赖第三方 WASM 打包。', 'https://www.oschina.net', '2026-10-28'),
 ('多模态上下文窗口突破百万 token，长文档问答成本骤降', '机器之心', '大模型',
  '新一代模型支持整本书级上下文输入，RAG 检索链路在部分场景被长窗口直接替代，知识库架构设计面临重构。', 'https://www.jiqizhixin.com', '2026-10-25'),
 ('SSE 流式输出成 AI 应用标配，首字延迟优化成体验关键', 'InfoQ', 'AI工程',
  '主流 AI 产品将响应拆分为逐 token 推送，前端以流式渲染压缩用户等待感知，工程实践聚焦中断控制与增量渲染。', 'https://www.infoq.cn', '2026-10-22');

CREATE TABLE IF NOT EXISTS wang_gallery (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_title       TEXT NOT NULL,
    wang_category    TEXT NOT NULL,
    wang_description TEXT NOT NULL,
    wang_image       TEXT NOT NULL,
    wang_author      TEXT NOT NULL DEFAULT '王云鹤',
    wang_created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

INSERT INTO wang_gallery (wang_title, wang_category, wang_description, wang_image) VALUES
 ('神经网络之光', 'AI视觉',
  '以深蓝为底色的神经元网络渲染图，象征大语言模型内部的知识连接，本项目封面主视觉。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=glowing%20AI%20neural%20network%20brain%20on%20dark%20blue%20background%2C%20digital%20technology%2C%20photorealistic%203d%20render&image_size=landscape_4_3'),
 ('未来智慧城市', '概念设计',
  '夜幕下的立体城市与无人机航线，展示 AI 调度下的未来交通图景，用于科技周展板配图。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=futuristic%20smart%20city%20skyline%20with%20drones%20and%20holographic%20billboards%20at%20night%2C%20cinematic%20lighting&image_size=landscape_4_3'),
 ('图书馆里的代码', '校园生活',
  '学生在现代图书馆用笔记本编程，全息代码悬浮空中，描绘课程项目的日常开发场景。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=university%20student%20coding%20on%20laptop%20with%20floating%20holographic%20code%2C%20modern%20library%2C%20warm%20light&image_size=landscape_4_3'),
 ('机器人助教', 'AI伙伴',
  '明亮的教室里白色人形机器人正在板书讲解，畅想 AI 助教走进课堂的未来。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=friendly%20white%20humanoid%20robot%20assistant%20in%20bright%20classroom%2C%20soft%20daylight%2C%20photorealistic&image_size=landscape_4_3'),
 ('紫色数据中心', '基础设施',
  '紫光映照的服务器走廊，表现大模型推理集群的规模感，用于后端架构章节插图。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=server%20room%20with%20purple%20neon%20lights%2C%20data%20center%20aisles%2C%20sci-fi%20atmosphere&image_size=landscape_4_3'),
 ('对话的气泡', '产品概念',
  '手机上方漂浮着带星光的对话气泡，极简风格表达 AI 聊天产品的核心交互。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chat%20bubbles%20with%20sparkles%20floating%20above%20smartphone%2C%20AI%20conversation%20concept%2C%20clean%20minimal%20design&image_size=landscape_4_3'),
 ('量子实验室', '前沿科技',
  '低温制冷机环绕的量子计算原型机，蓝色调写实渲染，用于科技前沿专题配图。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=quantum%20computer%20laboratory%20with%20glowing%20cryogenic%20hardware%2C%20blue%20tones%2C%20photorealistic&image_size=landscape_4_3'),
 ('雨夜自动驾驶', '智能出行',
  '霓虹街景中行驶的新能源自动驾驶汽车，雨水倒影增强氛围，用于出行专题头图。',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=autonomous%20electric%20car%20driving%20through%20neon%20city%20street%20in%20rain%2C%20reflections%2C%20cinematic&image_size=landscape_4_3');

-- 2026-11-12 追加：RAG 知识库两表（与 wang_schema.sql 一致）
CREATE TABLE IF NOT EXISTS wang_kb_docs (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_filename    TEXT NOT NULL,
    wang_filetype    TEXT NOT NULL,
    wang_filesize    INTEGER NOT NULL,
    wang_chunks      INTEGER NOT NULL DEFAULT 0,
    wang_status      TEXT NOT NULL DEFAULT 'ok',
    wang_created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS wang_kb_chunks (
    wang_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wang_doc_id      INTEGER NOT NULL REFERENCES wang_kb_docs(wang_id) ON DELETE CASCADE,
    wang_seq         INTEGER NOT NULL,
    wang_content     TEXT NOT NULL
);
