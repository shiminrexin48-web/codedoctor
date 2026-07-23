# CodeDoctor

CodeDoctor 是一个本地优先的代码诊断工作台。它面向“刚拿到一个陌生项目”的场景：识别技术栈和项目用途，执行静态规则分析，给出可解释的健康评分，并可调用 DeepSeek、OpenAI GPT、阿里云千问或 OpenAI 兼容模型解释问题、生成修改提示词。

> 当前版本是开发者预览版。评分用于快速排查和横向观察，不等同于代码审计、漏洞扫描认证或真实运行验收。

## 能做什么

- 直接在网页中选择整个项目文件夹，无需先生成 JSON。
- 识别 Node.js、前端、Python、Java、C/C++、.NET、Go、Rust 等源码及常见工程清单。
- 从工程健康、安全、可维护性、测试、依赖、构建运行、框架专项和 AI 编码风险 8 个维度评分。
- 区分生产源码、测试、夹具、文档、生成物和依赖目录，降低误报与虚假高分。
- 查看问题证据、修复建议、评分扣分构成、项目优缺点和 Markdown 报告。
- 对选中的问题进行按需 AI 解释，限制调用数量，避免无意义消耗 Token。
- 通过 CLI 扫描更大的本地项目，并输出 JSON 与 Markdown 报告。

## 3 分钟启动

### 环境要求

- Node.js 22 或更高版本
- pnpm 9 或更高版本
- 推荐使用 Chrome、Edge 等支持文件夹选择的现代浏览器

检查环境：

```bash
node --version
pnpm --version
```

### 安装并启动网页

```bash
cd codedoctor
pnpm install
pnpm dev
```

看到 Vite 启动信息后，打开 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。停止服务时在终端按 `Ctrl+C`。

## 扫描项目

### 方式一：网页导入文件夹

1. 启动网页，进入“总览”。
2. 点击“导入项目”，选择项目的根目录，而不是单个 `src` 目录。
3. 等待本地扫描完成，在“问题”查看证据，在“报告”查看整体结论。
4. 需要模型解释时，再进入“AI”配置 API Key 并选择具体问题。

网页扫描默认限制：

| 项目 | 上限 | 原因 |
| --- | ---: | --- |
| 文件数量 | 5,000 | 防止浏览器内存和文件读取任务失控 |
| 项目总体积 | 250 MB | 避免 Worker 通信和页面响应恶化 |
| 单个可读文本文件 | 512 KB | 大文件仍会计入项目，但不会读取全文 |

超出限制时，优先用项目根目录的 `.codedoctorignore` 排除依赖、构建产物、媒体和模型文件；大型仓库建议使用 CLI。

### 方式二：CLI 扫描

扫描当前项目：

```bash
pnpm scan .
```

扫描任意目录：

```bash
pnpm scan /绝对路径/项目目录
```

报告写入被扫描项目的：

```text
.codedoctor/report.json
.codedoctor/report.md
```

查看 CLI 参数：

```bash
pnpm dev:cli -- --help
```

禁用特定分析器时可重复传参：

```bash
pnpm scan . --disable-analyzer secret --disable-analyzer maintainability
```

## AI 解释

静态扫描不需要 API Key，只有主动请求 AI 解释时才会调用模型。

### 网页方式

在“AI”页面选择提供商和模型，再输入对应 API Key。常用入口包括 DeepSeek、OpenAI GPT、阿里云千问、Google Gemini；“更多模型”还提供 Kimi、智谱 GLM、硅基流动、OpenRouter、Groq、Mistral 和 Ollama。云端服务默认通过本地 Vite 代理转发；也可以选择浏览器直连。每个提供商的 Key 独立保存在当前标签页的 `sessionStorage`，关闭会话后清除。不要在公共电脑使用真实 Key，也不要把 Key 写进源码或提交到仓库。

“自定义”支持兼容 OpenAI Chat Completions 的 `http/https` 地址，必须填写模型 ID 和兼容 API 地址。自定义服务始终由浏览器直接请求，请确认服务端允许 CORS，并只使用可信端点。

Ollama 默认连接 `http://127.0.0.1:11434`，不需要真实 API Key；先在本机执行 `ollama serve` 并拉取所选模型。

网页端支持多提供商；CLI 的 `--ai deepseek` 当前仍使用 DeepSeek 适配器。

### CLI 方式

```bash
export DEEPSEEK_API_KEY="你的-key"
export DEEPSEEK_MODEL="deepseek-v4-pro"
pnpm scan . --ai deepseek --ai-limit 2
```

`--ai-limit` 范围为 0 到 10，建议先用 1 到 3。`.env.example` 只提供变量名，不应填写并提交真实凭据。

## 支持范围

| 类型 | 当前能力 |
| --- | --- |
| Node.js / Web 前端 | 工程识别、脚本与入口、依赖、测试、安全、维护性规则 |
| Python | 清单与源码识别、测试/安全/维护性通用规则、项目画像 |
| Java / JVM | Maven/Gradle 与源码识别、测试/安全/维护性通用规则 |
| C / C++ | CMake/Make 与源码识别、测试/安全/维护性通用规则 |
| .NET / Go / Rust | 项目与源码识别、通用健康评分；专项规则仍在扩展 |
| 脚本、CLI、SDK、数据/ML、基础设施、扩展 | 用途识别与通用维度评分 |
| 多项目混合导入 | 给出“受限评分”，建议按项目根目录分别扫描 |
| Unity / Unreal Engine | 仅识别，不给正式分数，避免脱离引擎和构建环境的错误评分 |
| 压缩包、纯二进制、纯媒体目录 | 不展开或不评分；请先解压并导入源码根目录 |

## 如何理解分数

总分由 8 个维度按固定权重合成。每个维度都应同时查看“置信度”“是否验证”和“扣分依据”。

- `100` 不代表项目没有缺陷，只代表已启用规则没有发现对应问题。
- 网页和默认 CLI 执行的是静态分析，不会安装依赖、运行测试、启动服务或连接外部系统。
- “构建与运行”未实际执行时会标为未验证，不应把该维度当作运行成功证明。
- 陌生语言、混合项目和证据不足的输入会降低识别置信度或限制评分。
- 密钥扫描与依赖检查不能替代专业安全审计和完整漏洞数据库。

## 忽略规则

CodeDoctor 默认排除 `node_modules`、构建产物、版本控制目录和自身报告。可在待扫描项目根目录创建 `.codedoctorignore`：

```gitignore
vendor/
datasets/
**/*.min.js
generated/
```

只排除明确的第三方、生成或非源码内容。不要为了提高分数而忽略真实业务源码、分析器或失败测试；这会让报告失真。

## 开发与验证

```bash
# 网页开发服务器
pnpm dev:web

# 运行全部测试
pnpm test

# 构建全部工作区包
pnpm build

# 测试后构建，提交前推荐执行
pnpm check

# 预览生产构建（需先 pnpm build）
pnpm preview:web
```

工作区结构：

```text
apps/web/           React + Vite 网页工作台
apps/cli/           本地 CLI 入口
packages/core/      扫描流程与项目画像
packages/detectors/ 技术栈和文件范围识别
packages/analyzers/ 静态分析器
packages/scoring/   可解释评分引擎
packages/report/    JSON / Markdown 报告
packages/ai/        CLI DeepSeek 解释适配器
packages/shared/    跨包类型与协议
```

## 常见问题

### `pnpm: command not found`

先安装 Node.js 22，再运行 `corepack enable` 和 `corepack prepare pnpm@9.15.4 --activate`，然后重新打开终端。

### 端口 5173 被占用

```bash
pnpm dev:web -- --port 5174
```

然后打开 `http://127.0.0.1:5174/`。

### 导入后没有分数

确认选择的是已解压的源码根目录。Unity、Unreal、空目录、纯二进制/媒体目录不会给正式分数；多个独立项目一起导入时只给受限评分。

### 大项目无法上传或页面变慢

先排除 `node_modules`、`.git`、`dist`、`build`、数据集、媒体和模型文件。浏览器仍超限时使用 `pnpm scan /项目路径`，避免把整个大仓库复制进浏览器内存。

### AI 请求失败

确认开发服务器仍在运行、Key 有效且模型名可用。默认代理只在 Vite 开发/预览环境配置下生效；直接请求模式可能受到浏览器 CORS 策略限制。

## 安全与贡献

安全问题请参考 [SECURITY.md](./SECURITY.md)，开发约定请参考 [CONTRIBUTING.md](./CONTRIBUTING.md)。重要变化记录在 [CHANGELOG.md](./CHANGELOG.md)，架构与信任边界见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

首次发布请按 [GitHub 发布指南](./docs/PUBLISH_TO_GITHUB.md) 操作。仓库发布后，维护者还需要完成无法由源码自动启用的 [GitHub 设置清单](./docs/GITHUB_SETTINGS.md)，包括分支保护、Secret scanning 和 Private vulnerability reporting。项目采用 [MIT License](./LICENSE)。
