# 阿杰学长 · 初三 AI 学习助手（自用版）

面向浙江（湖州）中考的初三全科智能学习助手：知识地图梳理 → 总结卡 → 自适应刷题 → 错题本 → 积分徽章激励。
**本版本为个人自用**：无需注册、无需登录、无需密码，启动即用。

## 使用方式

### 方式一：双击启动（最省事，推荐）

直接双击项目根目录的 **`start.bat`**：

1. 首次运行会自动构建前端（约 1–2 分钟，之后不再重复）；
2. 后台启动服务并自动打开浏览器 `http://localhost:3001`；
3. 若端口 3001 已被占用，会提示服务可能已在运行，无需重复启动；
4. 关闭启动窗口不会停止服务，停止服务请双击 **`stop.bat`**。

### 方式二：命令行启动（最通用）

```bash
npm install        # 首次拉依赖
npm run build      # 构建前端到 dist/
npm run start      # 启动后端（监听 127.0.0.1:3001 并托管 dist/）
```

浏览器访问 `http://localhost:3001`。项目根目录还提供了 **`打开阿杰学长.url`**，可拖到桌面双击直达。

> 需要 Node.js 18+（已在 `D:\Program Files\nodejs` 或 `C:\Program Files\nodejs` 时无需额外配置）。


## 环境变量（可选）

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 否 | 配置后启用真人 AI 讲解；不填走演示模式（本地湖州/浙江中考风格题库与预置总结） |
| `DEEPSEEK_BASE_URL` | 否 | 自定义 API 网关，默认 `https://api.deepseek.com/v1` |
| `PORT` | 否 | 后端端口，默认 3001 |

> 自用本机访问，服务仅监听 `127.0.0.1`（仅本机可连），比 `0.0.0.0` 更安全。

## 技术栈

- 前端：React 18 + Vite
- 后端：Express + `better-sqlite3`（同步 SQLite）
- AI：配置 `DEEPSEEK_API_KEY` 走真实 DeepSeek，否则回退本地题库/预置总结

## 目录结构

```
src/server/
  index.js        Express 入口与路由（单用户，免登录）
  db.js           SQLite 初始化、表结构、旧库迁移
  knowledge.js    大纲、掌握度计算、总结卡
  quizbank.js     本地湖州/浙江中考风格题库（语文考点已全量录入）
  ai.js           AI 讲解/总结/出题（含演示回退）
  mistakes.js     错题本
  gamify.js       积分与徽章
  summaries.js    中考考法预置总结卡（全科覆盖）
src/client/
  App.jsx         顶层导航与全局错误提示
  api.js          接口封装
  components/     知识地图 / 刷题 / 错题本 / 对话 / 徽章墙
tests/            node:test 用例
```

## 刷题说明

- 语文全部考点已录入本地题库，点「去刷题」即出对应真题。
- 数学/科学/英语/道法/历史等科目多数考点暂未录入本地题；未录入的考点点「去刷题」时，界面会明确提示「该考点暂未录入题库，可先复习总结卡」，而不会再回退到无关学科的演示题。
- 配置 `DEEPSEEK_API_KEY` 后，未录入的考点可由 AI 即时生成对应题目。

## 常用脚本

```bash
npm test          # 运行全部测试
```

## 数据

学习数据保存在项目根目录的 `app.db`（已加入 .gitignore，不会提交）。
