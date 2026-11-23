<!-- 姓名：王云鹤 日期：2026-11-23 功能：AI资讯 Supabase 数据库信息 -->

# database.md — AI 资讯（Supabase 远程数据库）

> 本功能（`ai_news.html` AI 新闻列表）的服务器端为 **Supabase 托管的远程 PostgreSQL**，
> 后端 Express / SQLite 未做任何改动，前端通过原生 `fetch` 直连 Supabase REST API 匿名只读。
> 本文件记录该数据库的全部信息，仅凭本文件即可在新环境完成重建。

## 一、项目连接信息

| 项目 | 值 |
|---|---|
| Supabase 项目 Reference | `rimojqybhwaciigumezw` |
| 项目 URL（API 网关） | https://rimojqybhwaciigumezw.supabase.co |
| 数据库区域 | ap-southeast-1 |
| 数据库引擎 | PostgreSQL（Supabase 托管） |
| 操控方式 | Supabase MCP（tools: execute_sql / apply_migration 等，配置见 `.trae/mcp.json`） |

## 二、密钥（publishable key 可公开，受 RLS 保护仅可读）

| 密钥类型 | 值 | 用途 |
|---|---|---|
| publishable（新格式） | `sb_publishable_apgAlLBxucRQ8zE6a6KQSQ_ovSBSRc4` | 前端 REST 匿名只读（已写入 `frontend/js/wang_ai_news.js`） |
| legacy anon（JWT，备用） | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbW9qcXliaHdhY2lpZ3VtZXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MTUyODEsImV4cCI6MjExMDk5MTI4MX0.8SR1mHViaZy7wCFVd7kjKJgVJcoAPYjinSdYUG2WPIA` | 同上，旧格式兼容 |
| service_role / MCP PAT | 不记录于前端代码；PAT 配置在 `c:\Users\ASUS\.trae-cn\mcp.json` 的 Authorization 头 | 管理端（建表/写入），严禁出现在前端 |

## 三、表结构 `public.wang_ai_news`

```sql
create table if not exists public.wang_ai_news (
    wang_id bigint generated always as identity primary key,   -- 新闻 ID（自增）
    wang_title text not null,                                  -- 标题
    wang_summary text not null,                                -- 摘要（列表展示）
    wang_content text not null,                                -- 正文（详情弹窗展示）
    wang_category text not null,                               -- 分类：大模型/行业应用/芯片硬件/政策监管/开源生态/投融资/具身智能
    wang_source text not null,                                 -- 来源媒体（模拟）
    wang_image_url text,                                       -- 配图 URL（可空，文生图服务生成）
    wang_is_featured boolean not null default false,           -- 是否头条
    wang_published_at timestamptz not null,                    -- 发布时间
    wang_created_at timestamptz not null default now()         -- 入库时间
);

alter table public.wang_ai_news enable row level security;

drop policy if exists "wang_ai_news_public_read" on public.wang_ai_news;
create policy "wang_ai_news_public_read"
    on public.wang_ai_news
    for select
    to anon, authenticated
    using (true);
```

- RLS 已启用，anon 角色仅授 `select`，前端无法增删改，保证数据安全。

## 四、模拟数据（20 条，均有完整业务含义）

发布时间分布 2026-11-14 ~ 2026-11-23，标题/摘要/正文三段式内容完整：

| # | 分类 | 标题（节选） | 来源 |
|---|---|---|---|
| 1 | 大模型（头条，含配图） | 双子星 3.0 发布：推理成本再降 60%，原生多模态成标配 | 智能前沿日报 |
| 2 | 开源生态 | 700 亿参数开源 MoE 模型发布，推理性能逼近闭源旗舰 | AI 观察室 |
| 3 | 芯片硬件（含配图） | 国产 AI 推理芯片进入量产：算力密度提升 3 倍，功耗下降 40% | 科技晨报 |
| 4 | 政策监管 | 《生成式人工智能服务管理办法（修订版）》今起施行 | 数智周刊 |
| 5 | 行业应用 | 全国三甲医院 AI 辅助诊断覆盖率过半，影像读片效率提升 40% | 医智前线 |
| 6 | 具身智能（含配图） | 人形机器人批量进入 3C 工厂：分拣良率 99.2%，单班可替代 6 名工人 | 机器之心观察 |
| 7 | 投融资 | AI 编程助手初创完成 12 亿元 B 轮融资，估值一年翻三倍 | 创投风向标 |
| 8 | 大模型 | 上下文长度迈入千万 token 时代：整本书级理解成为现实 | 智能前沿日报 |
| 9 | 行业应用 | 多所高校将 AI 素养纳入必修：2026 级新生全员开课 | 教育科技报 |
| 10 | 行业应用 | L4 级 Robotaxi 十二城常态化运营，单城日均订单突破 5 万 | 出行未来网 |
| 11 | 开源生态 | 国产深度学习框架 3.0 发布：分布式训练效率提升 55% | 开源中国观察 |
| 12 | 政策监管 | AI 生成内容标识新国标落地：隐式水印成为强制要求 | 数智周刊 |
| 13 | 行业应用 | AI 制药首个分子进入 II 期临床，研发周期缩短至 18 个月 | 医药创新眼 |
| 14 | 芯片硬件（含配图） | AI 眼镜年度出货量预计突破 800 万台，实时翻译成为王牌应用 | 穿戴新知 |
| 15 | 行业应用 | AI 病虫害识别覆盖 2000 万亩耕地，农药使用量平均下降 15% | 智慧农业周刊 |
| 16 | 大模型 | 端侧小模型竞赛升温：3B 参数模型手机端实现 90 token/s | 智能前沿日报 |
| 17 | 行业应用 | 六大行大模型风控中台上线：欺诈识别准确率 98.7% | 金融科技报 |
| 18 | 大模型 | AI 气象大模型台风路径预测误差缩至 28 公里，预警提前 72 小时 | 云端研究院 |
| 19 | 行业应用 | 智能合同审查平台落地 500 家律所，审查时长从 3 小时缩至 5 分钟 | 法科新视野 |
| 20 | 行业应用 | AI 动画短片获国际电影节最佳实验影片提名，行业激辩创作边界 | 影视科技站 |

分类统计：行业应用 8、大模型 4、芯片硬件 2、政策监管 2、开源生态 2、投融资 1、具身智能 1。

## 五、前端访问方式（原生 fetch，无第三方库）

```js
// frontend/js/wang_ai_news.js 核心请求（收发数据均打印浏览器控制台）
const wang_url = 'https://rimojqybhwaciigumezw.supabase.co/rest/v1/wang_ai_news?select=*&order=wang_published_at.desc';
const wang_res = await fetch(wang_url, {
    headers: {
        'apikey': 'sb_publishable_apgAlLBxucRQ8zE6a6KQSQ_ovSBSRc4',
        'Authorization': 'Bearer sb_publishable_apgAlLBxucRQ8zE6a6KQSQ_ovSBSRc4',
        'Accept': 'application/json'
    }
});
```

- REST 端点为 PostgREST 风格：支持 `select`、`order`、`limit`、`eq.` 等查询参数；
- 响应为 JSON 数组（HTTP 200），20 条约 30KB；
- 页面验证入口：http://localhost:416/ai_news.html

## 六、CDN 说明

页面零 CDN 依赖：图标为本项目 `frontend/fonts/` 本地 iconfont，样式与脚本均为本地文件，
无需下载任何 CDN 资源即满足"CDN 文件本地化"要求；配图 URL 为文生图服务直链，存于数据库中。
