# Atoms - 一条 Prompt 重建指南

> 以下 prompt 用于从零重建 Atoms 项目。使用前先执行：
> ```bash
> npx create-next-app@latest atoms --typescript --tailwind --eslint --app --src-dir
> cd atoms
> npx shadcn@latest init    # 选 dark 主题, zinc 色板
> npx shadcn@latest add button input textarea card tabs scroll-area tooltip avatar dialog badge separator dropdown-menu
> npm install @supabase/supabase-js @supabase/ssr openai @anthropic-ai/sdk lucide-react
> ```

---

## Prompt

```
帮我构建一个名为 "Atoms" 的 AI 多智能体代码生成平台。用户描述需求后，三个 AI Agent（Planner → Coder → Reviewer）依次流式工作，生成完整的 HTML 应用并实时预览。

下面是完整的技术规格，请严格按照模块逐一实现。

---

## 一、技术栈

- Next.js (App Router, `output: "standalone"` in next.config.ts)
- TypeScript
- Tailwind CSS + shadcn/ui（已安装 button, input, textarea, card, tabs, scroll-area, tooltip, avatar, dialog, badge, separator, dropdown-menu）
- Supabase（Auth + PostgreSQL）
- AI：通过 OpenAI 兼容 API 调用 Claude 和 OpenAI（都用 openai 这个 npm 包）
- Docker 部署

---

## 二、数据库 (supabase/schema.sql)

三张表，全部启用 RLS：

1. **projects**: id(uuid pk), user_id(uuid ref auth.users on delete cascade), name(text), description(text), current_code(text), model_provider(text default 'claude'), created_at(timestamptz), updated_at(timestamptz)
2. **messages**: id(uuid pk), project_id(uuid ref projects on delete cascade), role(text), content(text), metadata(jsonb), created_at(timestamptz)
3. **generated_files**: id(uuid pk), project_id(uuid ref projects on delete cascade), version(int default 1), filename(text), content(text), language(text), created_at(timestamptz)

RLS 策略：用户只能 CRUD 自己的 projects；messages 和 generated_files 通过 project_id 关联到 user_id 来控制权限。

---

## 三、TypeScript 类型 (src/types/index.ts)

```ts
export interface Project {
  id: string; user_id: string; name: string; description: string | null;
  current_code: string | null; model_provider: "claude" | "openai";
  created_at: string; updated_at: string;
}
export interface Message {
  id: string; project_id: string;
  role: "user" | "assistant" | "planner" | "coder" | "reviewer" | "system";
  content: string; metadata: Record<string, unknown> | null; created_at: string;
}
export interface GeneratedFile {
  id: string; project_id: string; version: number; filename: string;
  content: string; language: string | null; created_at: string;
}
export type AgentRole = "planner" | "coder" | "reviewer";
```

---

## 四、Supabase 客户端 (src/lib/supabase/)

1. **client.ts** — 浏览器端，使用 `createBrowserClient`。如果环境变量缺失，返回 placeholder client 避免构建报错。
2. **server.ts** — 服务端，使用 `createServerClient` + `cookies()`。同样处理 placeholder 逻辑。
3. **middleware.ts** — 导出 `updateSession(request, locale)` 函数：用 `createServerClient` 刷新 session，未登录则重定向到 `/${locale}/login`。

---

## 五、AI 客户端 (src/lib/ai/)

两个文件都用 `openai` npm 包，通过 `AI_API_KEY` 和 `AI_BASE_URL` 环境变量配置。

1. **claude.ts** — `streamClaude(systemPrompt, userMessage)` 异步生成器，使用 `CLAUDE_MODEL` 环境变量（默认 "claude-sonnet-4-20250514"）
2. **openai.ts** — `streamOpenAI(systemPrompt, userMessage)` 异步生成器，使用 `OPENAI_MODEL` 环境变量（默认 "gpt-4o"）

两者都调用 `client.chat.completions.create({ stream: true, max_tokens: 8192 })`，yield 每个 chunk 的 delta.content。

---

## 六、智能体 (src/lib/agents/)

**prompts.ts** 定义三个 system prompt 和 builder 函数：

- `PLANNER_SYSTEM_PROMPT`：分析需求、输出简洁技术方案（200 字内），最终产物是单个 HTML 文件
- `CODER_SYSTEM_PROMPT`：根据方案生成完整自包含 HTML（内联 CSS/JS），支持 React via CDN，现代暗色设计
- `REVIEWER_SYSTEM_PROMPT`：审查代码（150 字内），用 ✅⚠️💡 格式

- `buildPlannerPrompt(userRequest, currentCode, history)`：拼接现有代码和对话历史
- `buildCoderPrompt(plan, userRequest, currentCode)`：拼接方案和代码
- `buildReviewerPrompt(userRequest, code)`：拼接需求和代码

**planner.ts / coder.ts / reviewer.ts**：各导出 `runPlanner/runCoder/runReviewer` 异步生成器，根据 provider 参数选择 streamClaude 或 streamOpenAI。

---

## 七、代码生成 API (src/app/api/generate/route.ts)

POST，接收 `{ projectId, prompt, modelProvider, currentCode, history }`。

使用 SSE (Server-Sent Events) 流式返回，三阶段串行：
1. 发送 `{ agent: "planner" }`，然后流式发送 planner 的每个 chunk `{ content: "..." }`
2. 发送 `{ agent: "coder" }`，流式发送 coder 的 chunk，完成后提取 HTML（从 markdown 代码块中提取或直接使用），发送 `{ code: finalCode }`
3. 将 finalCode 存入 generated_files 表（自动递增 version），发送 `{ files: [newFile] }`
4. 发送 `{ agent: "reviewer" }`，流式发送 reviewer 的 chunk
5. 最后发送 `{ done: true }`

使用 `SUPABASE_SERVICE_ROLE_KEY` 创建 admin client 来写数据库。设置 `maxDuration = 120`。

---

## 八、国际化 (i18n)

**src/lib/i18n/config.ts**：定义 locales = ["zh", "en"]，defaultLocale = "zh"。

**src/app/[lang]/dictionaries.ts**：使用 `import("./dictionaries/zh.json")` 动态导入，导出 getDictionary、hasLocale、Dictionary 类型。

**字典文件** `src/app/[lang]/dictionaries/zh.json` 和 `en.json`，包含以下 key 分组：
- `common`: brand("Atoms"), signIn, signUp, getStarted, loading, signOut
- `landing`: badge, heroTitle1, heroTitle2, heroDescription, startBuilding, feature1Title/Desc, feature2Title/Desc, feature3Title/Desc
- `login`: welcomeBack, createAccount, signInDesc, signUpDesc, email, password, alreadyHaveAccount, noAccount
- `dashboard`: heroTitle, heroSubtitle, inputPlaceholder, credits, discover, myProjects, templates, noProjects, noProjectsDesc, updated
- `templates`: landingPage, landingPageDesc, todoApp, todoAppDesc, dashboard, dashboardDesc, productPage, productPageDesc
- `sidebar`: home, docs, newProject

---

## 九、中间件 (src/proxy.ts，导出为 middleware)

功能：
1. 跳过 /api、/_next、静态文件
2. 如果 URL 没有 locale 前缀，根据 Accept-Language 重定向到 /zh 或 /en
3. 对 /dashboard 和 /project 路由调用 updateSession 做登录保护

注意：Next.js 的 middleware 从 src/proxy.ts 导出（或按照你的 Next.js 版本的约定放置）。

---

## 十、页面结构

### 1. 根页面 `src/app/page.tsx`
直接 redirect 到 "/zh"。

### 2. `src/app/[lang]/layout.tsx`
校验 locale，生成 staticParams，渲染 `<div lang={lang}>{children}</div>`。

### 3. Landing Page `src/app/[lang]/page.tsx`
暗色主题，包含：
- Header：品牌名 + 登录/开始按钮
- Hero：标题（带渐变高亮）、描述、CTA 按钮
- 3 个 Feature Card（智能规划、代码生成、实时预览）

### 4. Login `src/app/[lang]/login/page.tsx` + `LoginClient.tsx`
邮箱 + 密码的注册/登录切换表单，使用 Supabase Auth。登录成功跳转 dashboard。

### 5. Dashboard `src/app/[lang]/dashboard/page.tsx` + `DashboardClient.tsx`
- Sidebar：品牌、导航（首页/文档/新建项目）、项目列表、登出按钮
- Hero 区：标题 + AI 输入框（textarea + 提交按钮），输入后创建 project 并跳转工作区
- Tabs：发现 / 我的项目 / 模板 三个标签页
  - 我的项目：项目卡片网格，显示名称/描述/更新时间，支持删除
  - 发现：展示案例（SaaS、电商、Dashboard 等静态卡片）
  - 模板：Landing Page、Todo App、Dashboard、Product Page 四个模板

### 6. Project Workspace `src/app/[lang]/project/[id]/page.tsx`（核心页面）
全屏三栏布局：
- **左：ChatPanel** (380px)
  - 消息列表，根据 role 显示不同颜色图标（planner=紫色🧠，coder=蓝色💻，reviewer=绿色🔍）
  - 空状态显示 4 个模板快捷按钮（Landing Page、Todo App、Dashboard、Product Page）
  - 底部输入框，Enter 发送，Shift+Enter 换行
  - 智能打招呼检测：如果用户发送纯问候语（你好/hi/hello 等），直接回复引导文案，不触发 Agent 管线

- **中：PreviewPanel**（flex-1）
  - 顶栏：设备切换（Desktop/Tablet 768px/Mobile 375px）+ 刷新 + 全屏按钮
  - iframe 使用 srcDoc 渲染生成的 HTML，sandbox="allow-scripts allow-forms allow-modals allow-popups"

- **右：AgentPanel**（280px，含 Tabs）
  - Agents Tab：显示 planner/coder/reviewer 的消息，带彩色标签
  - Files Tab：文件列表 + 代码查看器

- 顶部 Header：返回按钮 + 项目名 + 设置弹窗（切换 Claude/GPT 模型）

SSE 消息处理逻辑：
  - 收到 `{ agent: "xxx" }` 切换当前 agent
  - 收到 `{ content: "..." }` 追加到对应 agent 的消息
  - 收到 `{ code: "..." }` 更新预览
  - 收到 `{ files: [...] }` 更新文件列表
  - 完成后批量将消息存入 Supabase，更新 project.current_code

---

## 十一、文档系统

**src/content/docs/zh/** 和 **src/content/docs/en/**，各含 getting-started.md、workspace.md、faq.md。

**src/lib/docs.ts**：读取 markdown 文件，返回 { slug, title, content }。

**src/app/[lang]/docs/layout.tsx**：左侧 sidebar 列出文档链接。
**src/app/[lang]/docs/[slug]/page.tsx**：渲染 markdown 内容。
**src/app/[lang]/docs/page.tsx**：重定向到 getting-started。

---

## 十二、Docker

**Dockerfile**：多阶段构建（deps → builder → runner），使用 node:20-alpine，standalone 输出。构建时注入 NEXT_PUBLIC_ 环境变量。

**docker-compose.yml**：映射 3001:3000，从 .env 注入环境变量：NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY, AI_BASE_URL, CLAUDE_MODEL, OPENAI_MODEL。

**.dockerignore**：node_modules, .next, .git, *.md 等。

---

## 十三、环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_API_KEY=
AI_BASE_URL=
CLAUDE_MODEL=
OPENAI_MODEL=
```

---

## 设计风格
- 全局暗色主题，zinc 色板
- 渐变色使用 blue-400 → violet-400
- 圆角 + 半透明边框（border-border/50）+ 微妙阴影
- 使用 Geist 字体（next/font/local）
- lucide-react 图标

请从 schema.sql 开始，按模块顺序逐个生成所有文件。每个文件输出完整代码。
```

---

## 使用建议

1. 在 Claude Code / Cursor 中粘贴以上 prompt
2. 如果上下文不够，可以分 2 次：先发 schema → agents → API 部分，再发页面 → i18n → Docker 部分
3. 生成后重点检查：Next.js 的 `params` 是否 await 了、Supabase middleware cookie 处理、SSE 流的 JSON 解析
