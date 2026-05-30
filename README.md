# Atoms

AI Agent 驱动的代码生成平台。描述你想要的应用，多智能体系统（Planner → Coder → Reviewer）会为你规划、编码并审查。

## 功能

### 多智能体代码生成
- **Planner Agent** — 分析用户需求，制定技术方案
- **Coder Agent** — 根据方案生成完整的 HTML/CSS/JS 代码
- **Reviewer Agent** — 审查生成的代码，给出质量评估和改进建议

### 工作区
- 聊天面板：与 AI Agent 对话，支持模板快速启动（Landing Page、Todo App、Dashboard、Product Page）
- 实时预览：iframe 内预览生成结果，支持桌面/平板/手机三种设备视图，支持全屏
- 文件面板：浏览生成的文件及代码，支持版本管理

### 多模型支持
- Claude（通过 OpenAI 兼容 API）
- OpenAI
- 支持自定义 API Base URL，可接入任意兼容接口

### 用户系统
- 基于 Supabase Auth 的邮箱注册/登录
- 行级安全策略（RLS），用户只能访问自己的项目
- 项目管理：创建、删除、切换项目

### 国际化 (i18n)
- 支持中文 / English
- 基于 URL 路径前缀（`/zh`、`/en`）的路由方案
- 自动根据浏览器语言偏好重定向

### 文档系统
- 内置 Markdown 文档，支持中英双语

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router, standalone output) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 认证 & 数据库 | Supabase (Auth + PostgreSQL) |
| AI | Anthropic Claude / OpenAI (流式输出) |
| 部署 | Docker (多阶段构建) |

## 快速开始

### 前置要求

- Node.js 20+
- Supabase 项目（[创建地址](https://supabase.com)）
- AI API Key（Claude 或 OpenAI）

### 1. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase/schema.sql`，创建 `projects`、`messages`、`generated_files` 三张表及 RLS 策略。

### 2. 配置环境变量

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AI_API_KEY=your-api-key
AI_BASE_URL=https://api.openai.com/v1    # 或其他兼容接口地址
CLAUDE_MODEL=claude-4.6                   # Claude 模型名
OPENAI_MODEL=gpt-5.4                      # OpenAI 模型名
```

### 3. 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 4. Docker 部署

```bash
# 创建 .env 文件，填入上述环境变量
docker compose up -d --build
```

服务将在 `http://localhost:3001` 启动。

## 项目结构

```
src/
├── app/
│   ├── [lang]/           # i18n 路由 (zh/en)
│   │   ├── dashboard/    # 项目仪表板
│   │   ├── docs/         # 文档页
│   │   ├── login/        # 登录/注册
│   │   └── project/[id]/ # 项目工作区
│   └── api/
│       ├── auth/callback/ # Supabase Auth 回调
│       └── generate/      # 多智能体代码生成 API (SSE)
├── components/
│   ├── dashboard/        # 仪表板组件
│   ├── ui/               # shadcn/ui 基础组件
│   └── workspace/        # 工作区组件 (Chat, Preview, Files)
├── content/docs/         # Markdown 文档 (zh/en)
├── lib/
│   ├── agents/           # Planner / Coder / Reviewer 智能体
│   ├── ai/               # Claude & OpenAI 流式客户端
│   ├── i18n/             # 国际化配置
│   └── supabase/         # Supabase 客户端 & 中间件
└── types/                # TypeScript 类型定义
```

## License

MIT
