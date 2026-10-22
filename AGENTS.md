# 项目规则（Advanced Web Design）

## 命名规范
- 所有 CSS 类名、id 名称、JS 变量（含函数名）一律以 `wyh_` 开头。

## 提示词记录（wyh_prompt.md）
- 执行任何用户提示词之前，先将该提示词写入项目根目录的 `wyh_prompt.md`。
- 以追加（append）方式写入，绝不覆盖之前的内容。
- 每条记录必须包含：时间（格式 `yyyy-mm-dd-hh-mm`）、使用的模型、提示词内容。

## 技术栈约束
- 仅使用原生 HTML、CSS、JavaScript 实现，禁止使用第三方库和 CDN 资源。
- 图标统一使用项目 `font` 目录下的 iconfont。
- 与服务器端数据交互使用原生 `fetch`。

## 页面注释
- 所有 HTML 页面必须包含注释：`<!-- 姓名：王云鹤 日期：yyyy-mm-dd 功能：功能名称 -->`
