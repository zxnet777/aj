# 阿杰学长 · 初三 AI 学习助手

面向浙江（湖州）中考的初三全科智能学习助手：知识地图梳理 → AI 总结卡 → 自适应刷题 → 错题本 → 积分徽章激励。
演示模式下无需任何外部 API Key 即可体验完整闭环（AI 内容使用本地湖州/浙江中考风格题库）。

## 技术栈

- 前端：React 18 + Vite + Tailwind
- 后端：Express + Node 内置 `node:sqlite`（Node 22+）
- 认证：JWT（密码使用 `crypto.scrypt` 加盐哈希，无明文存储）
- AI：配置 `DEEPSEEK_API_KEY` 后走真实 DeepSeek，否则自动回退本地题库/预置总结

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（必须）
#    JWT_SECRET 为必填，缺失时服务端会拒绝启动
#    DEEPSEEK_API_KEY 可选，不填则进入演示模式
$env:JWT_SECRET="你的随机密钥"           # PowerShell
# export JWT_SECRET="你的随机密钥"       # bash/zsh

# 3. 同时启动前端 + 后端（默认后端 3001，前端 5173）
npm run dev
```

启动后浏览器打开 Vite 提示的地址（一般 http://localhost:5173）。

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | 是 | JWT 签名密钥，缺失即拒绝启动，杜绝默认密钥泄露 |
| `DEEPSEEK_API_KEY` | 否 | 配置后启用真人 AI 讲解；不填走演示模式 |
| `DEEPSEEK_BASE_URL` | 否 | 自定义 API 网关，默认 `https://api.deepseek.com/v1` |
| `PORT` | 否 | 后端端口，默认 3001 |

## 常用脚本

```bash
npm run server     # 仅启动后端
npm run client     # 仅启动前端（Vite）
npm run dev        # 前后端一起
npm test           # 运行全部测试（自动注入测试用 JWT_SECRET）
```

## 目录结构

```
src/server/
  index.js        Express 入口与路由
  auth.js         注册/登录/JWT 中间件（scrypt 哈希）
  db.js           SQLite 初始化与表结构、旧库迁移
  knowledge.js    大纲、掌握度计算、总结卡
  quizbank.js     本地湖州/浙江中考风格题库（每考点 2–3 题）
  ai.js           AI 讲解/总结/出题（含演示回退）
  mistakes.js     错题本
  gamify.js       积分与徽章
  summaries.js    中考考法预置
src/client/
  App.jsx         顶层路由与全局错误提示
  api.js          接口封装
  components/     知识地图 / 刷题 / 错题本 / 对话 / 徽章墙 / 学伴
tests/            node:test 用例
```

## 测试覆盖

- 题库与大纲完全对齐（防止改大纲漏题）
- 密码 scrypt 哈希、重名/弱口令提示
- 错题本写入含选项与解析
- 难度自适应选题、掌握度合并口径
- 总结卡 / 刷题出对口题 / 接口鉴权

## 安全说明

- 密码使用 `crypto.scrypt` 加盐哈希，登录用定长比较防时序侧信道。
- 旧版本明文密码库无法登录，需重新注册（升级加密）。
- `JWT_SECRET` 缺失时进程直接退出，避免误用默认密钥上线。
