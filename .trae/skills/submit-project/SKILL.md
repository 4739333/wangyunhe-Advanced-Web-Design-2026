---
name: submit-project
description: 使用 git 将当前项目提交并推送到 Gitee 仓库 https://gitee.com/wyh0416/advanced-web-design.git。当用户说"提交项目""推送项目""上传到 Gitee"时使用。不用于在 Gitee 网页上创建仓库或配置账号凭据。
---

# 提交项目到 Gitee

在工作区根目录 `d:\Advanced Web Design` 执行以下流程，将当前项目提交并推送到 Gitee。

## 步骤

1. 检查仓库状态。若根目录没有 `.git`：
   - `git init`
   - `git branch -M main`
2. 检查远程仓库。若 `git remote get-url origin` 不存在，执行：
   - `git remote add origin https://gitee.com/wyh0416/advanced-web-design.git`
   若 origin 指向其他地址，先向用户报告，不要擅自覆盖。
3. 检查提交者身份。若 `git config user.name` 或 `git config user.email` 为空，设置仓库级配置：
   - `git config user.name "wangyunhe"`
   - `git config user.email "wangyunhe@example.com"`（提醒用户替换为 Gitee 注册邮箱）
4. 暂存并提交：
   - `git add -A`
   - 有变更时 `git commit -m "<用户指定的说明，默认：更新项目 YYYY-MM-DD>"`
   - 无变更时跳过提交，直接推送
5. 推送当前分支：
   - `git push -u origin main`（分支名以 `git branch --show-current` 为准）

## 失败处理

- 提示 `repository not found` 或 404：远程仓库尚未创建。指导用户在 Gitee 网页（https://gitee.com/projects/new）创建同名仓库 `advanced-web-design`，不要初始化 README 冲突文件，然后重试推送。
- 提示需要用户名密码（HTTPS 认证）：指导用户在 Gitee「设置 → 私人令牌」生成 token，推送时用户名填 Gitee 账号名、密码填 token；Windows 凭据管理器会记住凭据。
- 用户想用 SSH：指导用户把自己的公钥添加到 Gitee「设置 → SSH 公钥」，然后把远程改为 `git@gitee.com:wyh0416/advanced-web-design.git` 再推送。
- 推送被拒绝（远程有新提交）：先 `git pull --rebase origin main` 解决后再推送，冲突时停下询问用户。
