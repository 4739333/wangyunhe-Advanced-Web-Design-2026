@echo off
chcp 65001 >nul
title WangAI 全栈服务（端口 416）
cd /d %~dp0backend
echo ============================================
echo  WangAI 智能聊天系统 · 王云鹤 · 24002060416
echo  启动后端服务：http://localhost:416
echo ============================================
node server.js
pause
