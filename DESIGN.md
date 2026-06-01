# Atoms — AI Multi-Agent Code Generator

> 在线演示：https://atoms.kuaisanbu.com
用户名：demo@atoms.kuaisanbu.com
密码：AtomsDemo2024!
---

## 一、实现思路与关键取舍

### 架构选型

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 16 (App Router) | SSR + API Routes 一体化，不需要单独后端 |
| AI | Claude / GPT-4 (OpenAI 兼容协议) | 统一用 OpenAI SDK 接入，一套代码支持多模型 |
| 预览 | Sandpack (CodeSandbox 浏览器引擎) | 无需服务端编译，浏览器内完成 React 打包和渲染 |
| 数据库 | Supabase (PostgreSQL + Auth + RLS) | 免运维，自带认证和行级安全，适合快速原型 |
| 部署 | Docker + nginx (腾讯云) | 标准化部署，nginx 做静态资源和反代 |

### 核心设计：Multi-Agent Pipeline

没有采用单次 AI 调用生成代码的方案，而是拆成三个角色协作：

```
用户输入 → Intent Router → Planner → Coder → Reviewer → [自动重试] → 预览
                ↓
           普通对话/选项确认
```

**为什么这样拆：**
- **Planner 独立**：生成的 plan 可被用户编辑后重新生成，提供"可控性"
- **Reviewer 闭环**：自动检查文件完整性（import 是否指向存在的文件、是否截断），发现问题自动驱动 Coder 重试，最多 2 轮
- **Intent Router 前置**：不是所有对话都需要触发生成流程，先分类意图，避免无意义消耗 token

### 关键取舍

| 取舍 | 选了 | 放弃了 | 原因 |
|---|---|---|---|
| 预览方案 | 浏览器端 Sandpack | 服务端编译 + iframe | 零后端资源消耗，延迟更低 |
| 文件格式 | 自定义分隔符 `--- FILE: ---` | JSON 包裹 | LLM 输出流式可解析，不需要等完整 JSON |
| Sandpack bundler | 自建 (nginx 托管 + 包代理) | 直连 codesandbox CDN | 国内环境 codesandbox.io 不可达，必须自建 |
| Token 策略 | Coder 32K + 文件数限制提示 | 不限制 | 复杂项目超过 token 限制会截断，不如主动限文件数保证完整性 |
| 交互选项 | AI 输出 `[OPTIONS]` 标记 → 前端渲染表单 | 前端硬编码选项 | 让 AI 根据语境动态决定要问什么、给什么选项 |

### Sandpack 自建方案（国内部署的核心挑战）

Sandpack bundler 原本依赖以下域名，**在国内全部不可达**：
- `*.codesandbox.io` — bundler JS、API、协议脚本
- `col.csbops.io` — 遥测（直接 hang）
- `csb.app` / `csb.dev` — 协作相关
- `prod-packager-packages.codesandbox.io` — npm 包打包服务

解决方案：
1. 下载 bundler 静态文件到服务器本地
2. 用 Python 批量替换 JS 中所有被墙域名 → 指向自建 noop 端点
3. nginx 代理 npm 包服务，本地缓存 30 天（2GB 上限）
4. 遥测/协作类请求统一返回 204

---

## 二、当前完成程度

### 已完成

- [x] Multi-Agent 流式生成管线（Planner → Coder → Reviewer → 自动重试）
- [x] 实时 SSE 流式输出，三个 Agent 状态可视化
- [x] Sandpack 浏览器内预览（含设备切换：桌面/平板/手机）
- [x] Plan 可编辑、可基于修改后的 plan 重新生成
- [x] 文件完整性校验（import 引用检查 + 截断检测 + 括号平衡）
- [x] 意图分类（聊天 vs 生成），支持普通对话
- [x] 交互式选项（AI 动态输出 checkbox/radio 选项，用户勾选后一键确认）
- [x] 多模型支持（Claude / GPT-4，项目级切换）
- [x] 用户系统（Supabase Auth + RLS 行级安全）
- [x] 项目 CRUD + Dashboard
- [x] 中英文 i18n
- [x] Sandpack 国内自建部署（静态文件 + 包代理 + 域名替换）
- [x] Docker 容器化部署
- [x] 生成完成摘要（文件清单、重试次数、审查结论）

### 未完成

- [ ] 文件版本回溯（generated_files 表有 version 字段，但无回滚 UI）
- [ ] 项目代码导出 / 下载 ZIP
- [ ] 生成过程中断后恢复
- [ ] 用户 OAuth 登录（目前仅邮箱）
- [ ] 响应式移动端适配（workspace 固定三栏布局）
- [ ] API 限流 / 使用量统计

---

## 三、后续扩展与优先级

如果继续投入时间，我会按以下优先级推进：

### P0 — 直接影响演示效果

| 项 | 说明 | 预估 |
|---|---|---|
| **ZIP 下载** | 用户需要拿走生成的代码，一键导出为 ZIP | 0.5 天 |
| **版本对比** | 每次重新生成后可 diff 查看变更，回滚到之前版本 | 1 天 |
| **错误兜底** | 生成失败时给用户明确提示和重试按钮，而非空白 | 0.5 天 |

### P1 — 产品完整度

| 项 | 说明 | 预估 |
|---|---|---|
| **增量修改** | "把导航栏改成蓝色" → 只修改相关文件，不全量重生成 | 0.5 天 |
| **模板系统** | 预置常见项目模板（后台管理、电商、博客），跳过 Planner 阶段 | 1 天 |
| **多页面路由** | 支持 react-router 多页面项目，预览内可跳转 | 1 天 |
| **OAuth 登录** | GitHub / Google 登录 | 0.5 天 |

### P2 — 技术深度

| 项 | 说明 | 预估 |
|---|---|---|
| **Agent 可观测性** | token 用量、响应时间、重试原因结构化记录 → Grafana 面板 | 2 天 |
| **Prompt 版本管理** | 把 Agent prompt 存数据库，支持 A/B 测试不同 prompt 的生成质量 | 1 天 |
| **生成质量评估** | 自动对生成代码做 ESLint 检查 + 截图比对 | 3 天 |
| **协作 / 分享** | 项目分享链接，其他人可查看（只读） | 1 天 |
