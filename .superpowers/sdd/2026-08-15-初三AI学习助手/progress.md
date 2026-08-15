# SDD ledger — plan: docs/superpowers/plans/2026-08-15-初三AI学习助手.md

## 偏差记录
- 环境无 C++ 构建工具（Visual Studio），`better-sqlite3` 无法原生编译。改用 Node 24 内置 `node:sqlite`（零依赖）。所有涉及 db 的 Task 2/5/6 改用 `node:sqlite` API。
- 本机子代理仅只读工具，无法写文件/执行命令，故改为在主会话内联执行（inline execution）。
- Task 3 修正：OpenAI 客户端由模块顶层实例化改为惰性初始化（缺 API Key 时不再导入即崩溃）。
- Task 6 修正：（1）`index.js` 中 authRouter 导入路径错写为 `./auth.js`，改为 `./routes/auth.js`；（2）原计划的 `quiz/answer` 控制流有 bug（错题重复入库、答对也走错分支），重写为干净分支；（3）`app.listen(3001)` 放模块顶层导致测试 import 时端口冲突，改为仅在直接运行时监听。
- Task 7 修正：Login 组件 state 命名 bug（`setU/setPw` 与解构不一致），改为 `username/password`。
- Task 8 修正：QuizPanel 选项映射原假设字符串以 "A." 开头，改为按索引映射 A/B/C；App.jsx 底部 import 移到顶部。
- 集成测试改用 Node 内置 `node:http`，避免新增 supertest 依赖。

## 任务状态
- Task 1: complete (f562990) — 脚手架 + vite proxy
- Task 2: complete (3783a02) — db + 注册登录（node:sqlite）
- Task 3: complete (4f9d289) — DeepSeek 封装 + 阿杰学长人格 prompt
- Task 4: complete (c36ce87) — 积分/等级/打卡
- Task 5: complete (baf2e95) — 错题本 + 薄弱点
- Task 6: complete (dc9ed78) — chat/quiz/progress/mistakes 路由
- Task 7: complete (23703b4) — 前端骨架 + api client
- Task 8: complete (357054a) — 6 个组件

## 测试结果
- `node --test tests/*.js` → tests 7 / pass 7 / fail 0
- `npx vite build` → BUILD OK

## 待办（非阻塞，MVP 后）
- 排行榜：spec 要求默认可关闭，MVP 未实现排行榜即满足"默认关闭"。
- 徽章：earnBadge 为占位，待扩展 badge 表。
- 真实 AI 联调需用户提供 DEEPSEEK_API_KEY（填 .env）。
