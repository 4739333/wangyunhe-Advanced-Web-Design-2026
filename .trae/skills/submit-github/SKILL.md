---
name: submit-github
description: 使用 git 将当前项目提交并推送到 GitHub 仓库 git@github.com:4739333/wangyunhe-Advanced-Web-Design-2026.git（远程名 github，SSH 公钥已配置）。当用户说"提交到GitHub""推送到GitHub""上传到GitHub"时使用。不用于在 GitHub 网页创建仓库或添加 SSH 公钥，Gitee 提交请使用 submit-project。
---

# 提交项目到 GitHub

在工作区根目录 `d:\Advanced Web Design` 执行以下流程，将当前项目提交并推送到 GitHub。本仓库的 `origin` 指向 Gitee，GitHub 使用独立远程名 `github`，两者互不覆盖。

## 步骤

1. 确认远程。执行 `git remote get-url github`：
   - 不存在时：`git remote add github git@github.com:4739333/wangyunhe-Advanced-Web-Design-2026.git`
   - 存在但指向其他地址：先向用户报告，不要擅自修改。
2. 检查提交者身份。若 `git config user.name` 或 `git config user.email` 为空，设置仓库级配置：
   - `git config user.name "wangyunhe"`
   - `git config user.email "4739333+wangyunhe@users.noreply.github.com"`（提醒用户可改为 GitHub 注册邮箱）
3. 暂存并提交：
   - `git add -A`
   - 有变更时 `git commit -m "<用户指定的说明，默认：更新项目 YYYY-MM-DD>"`
   - 无变更时跳过提交，直接推送
4. 推送当前分支（分支名以 `git branch --show-current` 为准，当前为 `main`）：
   - `git push -u github main`

## 失败处理

- 提示 `repository not found` 或 404：远程仓库尚未创建。指导用户在 https://github.com/new 创建同名仓库 `wangyunhe-Advanced-Web-Design-2026`，不要勾选初始化 README/.gitignore，然后重试推送。
- 提示 `Permission denied (publickey)`：本机公钥未添加到 GitHub。输出 `~/.ssh/id_ed25519.pub` 内容，指导用户添加到 GitHub「Settings → SSH and GPG keys → New SSH key」，再用 `ssh -T git@github.com` 验证后重试。
- 推送被拒绝（远程有新提交）：先 `git pull --rebase github main` 解决后再推送，冲突时停下询问用户。
- 首次推送若远程默认分支为 `master` 而本地为 `main`：使用 `git push github HEAD:refs/heads/main` 并在 GitHub 设置中将默认分支改为 `main`。
