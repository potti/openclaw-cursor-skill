# Cursor Agent — OpenClaw 插件

在 OpenClaw 中调用本地 Cursor Agent CLI，并通过策略实现“先计划后开发”。

[English](README.md) | 中文

---

## 项目简介

`cursor-agent` 是 OpenClaw Gateway 插件，用于把聊天任务桥接到本地 Cursor Agent CLI。

主要能力：

- 通过 `/cursor` 直接执行
- 通过 `cursor_agent` 工具自动/回退执行
- 开发任务先 `plan`，再允许 `agent`
- 会话与项目状态持久化

---

## 核心流程

开发类任务推荐流程：

1. 接收 OpenClaw 任务
2. 先输出计划
3. 自动实现
4. 执行测试/校验
5. 回告 OpenClaw

项目命令约定：

- `/deliver`：默认交付流程（plan -> implement -> validate -> report）
- `/explore`：仅探索，不改功能代码

注意：插件运行时入口仍然是 `/cursor` 和 `cursor_agent`。

---

## 安装步骤

### 1）安装 Cursor Agent CLI

macOS / Linux：

```bash
curl https://cursor.com/install -fsSL | bash
```

Windows PowerShell：

```powershell
irm https://cursor.com/install | iex
```

验证：

```bash
agent --version
```

### 2）登录认证

```bash
agent login
```

或设置 `CURSOR_API_KEY`。

### 3）在 OpenClaw 中加载插件

源码路径方式：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
    }
  }
}
```

打包安装方式：

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

---

## 最小配置示例

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": {
            "my-project": "/abs/path/to/my-project"
          },
          "enableAgentTool": true,
          "enforcePlanBeforeDevelopment": true
        }
      }
    }
  }
}
```

---

## /cursor 用法

```text
/cursor <project> [options] <prompt>
```

常用参数：

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--model <model>`
- `--reset-plan-gate`

示例：

```bash
/cursor my-project --mode ask 解释认证模块架构
/cursor my-project --mode plan 设计缓存方案
/cursor my-project --mode agent 实现 token 刷新逻辑
/cursor my-project --reset-plan-gate
```

---

## 交付回告规范

交付任务最终回复建议包含：

- `Status`: `SUCCESS | PARTIAL | BLOCKED`
- 任务摘要
- 变更文件与关键改动
- 测试/校验命令与结果
- 是否可交接 OpenClaw

---

## 开发与发布

```bash
npm install
npm run dev
npm run build
npm test
```

发布前请执行：

- [发布检查清单](docs/release-checklist.md)

---

## 许可证

[Apache-2.0](LICENSE)
# Cursor Agent — OpenClaw 插件

在 OpenClaw 中调用本地 Cursor Agent CLI，并通过策略实现“先计划后开发”。

[English](README.md) | 中文

---

## 项目简介

`cursor-agent` 是 OpenClaw Gateway 插件，用于把聊天任务桥接到本地 Cursor Agent CLI。

主要能力：

- 通过 `/cursor` 直接执行
- 通过 `cursor_agent` 工具自动/回退执行
- 开发任务先 `plan`，再允许 `agent`
- 会话与项目状态持久化

---

## 核心流程

开发类任务推荐流程：

1. 接收 OpenClaw 任务
2. 先输出计划
3. 自动实现
4. 执行测试/校验
5. 回告 OpenClaw

项目命令约定：

- `/deliver`：默认交付流程（plan -> implement -> validate -> report）
- `/explore`：仅探索，不改功能代码

注意：插件运行时入口仍然是 `/cursor` 和 `cursor_agent`。

---

## 安装步骤

### 1）安装 Cursor Agent CLI

macOS / Linux：

```bash
curl https://cursor.com/install -fsSL | bash
```

Windows PowerShell：

```powershell
irm https://cursor.com/install | iex
```

验证：

```bash
agent --version
```

### 2）登录认证

```bash
agent login
```

或设置 `CURSOR_API_KEY`。

### 3）在 OpenClaw 中加载插件

源码路径方式：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
    }
  }
}
```

打包安装方式：

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

---

## 最小配置示例

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": {
            "my-project": "/abs/path/to/my-project"
          },
          "enableAgentTool": true,
          "enforcePlanBeforeDevelopment": true
        }
      }
    }
  }
}
```

---

## /cursor 用法

```text
/cursor <project> [options] <prompt>
```

常用参数：

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--model <model>`
- `--reset-plan-gate`

示例：

```bash
/cursor my-project --mode ask 解释认证模块架构
/cursor my-project --mode plan 设计缓存方案
/cursor my-project --mode agent 实现 token 刷新逻辑
/cursor my-project --reset-plan-gate
```

---

## 交付回告规范

交付任务最终回复建议包含：

- `Status`: `SUCCESS | PARTIAL | BLOCKED`
- 任务摘要
- 变更文件与关键改动
- 测试/校验命令与结果
- 是否可交接 OpenClaw

---

## 开发与发布

```bash
npm install
npm run dev
npm run build
npm test
```

发布前请执行：

- [发布检查清单](docs/release-checklist.md)

---

## 许可证

[Apache-2.0](LICENSE)
# Cursor Agent — OpenClaw 插件

在 OpenClaw 中调用本地 Cursor Agent CLI，并通过策略实现“先计划后开发”。

[English](README.md) | 中文

## 项目简介

`cursor-agent` 用于把聊天中的开发任务桥接到本地 Cursor Agent CLI，支持：

- `/cursor` 直接调用
- `cursor_agent` 工具调用
- 开发任务先 `plan` 再 `agent`
- 会话与项目状态持久化

## 核心流程

1. 接收 OpenClaw 任务
2. 先输出计划
3. 自动实现
4. 执行测试
5. 回告 OpenClaw

项目命令约定：

- `/deliver`：默认交付流程
- `/explore`：仅探索，不改代码
- `/archive`：归档已完成变更

## 最小配置

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": { "my-project": "/abs/path/to/my-project" },
          "enforcePlanBeforeDevelopment": true
        }
      }
    }
  }
}
```

## /cursor 用法

```text
/cursor <project> [options] <prompt>
```

常用参数：

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--reset-plan-gate`

## 交付回告格式

- `Status`: `SUCCESS | PARTIAL | BLOCKED`
- 任务摘要
- 变更文件
- 测试结果
- 是否可交接 OpenClaw

## 开发与发布

```bash
npm install
npm run dev
npm run build
npm test
```

发布前请执行：

- [发布检查清单](docs/release-checklist.md)

## 许可证

[Apache-2.0](LICENSE)
# Cursor Agent — OpenClaw 插件

在 OpenClaw 中直接调用本地 Cursor Agent CLI，并通过策略控制实现先计划后开发的交付流程。

[English](README.md) | 中文

---

## 项目简介

`cursor-agent` 是一个 OpenClaw Gateway 插件，用于把聊天中的开发任务桥接到本地 Cursor Agent CLI。

它提供：

- 通过 `/cursor` 直接执行
- 通过 `cursor_agent` 工具自动/回退执行
- 策略门控（开发任务先 plan）
- 会话与项目状态持久化
- 透明输出与可核验结果

---

## 核心工作流

开发类任务推荐流程：

1. 接收 OpenClaw 任务
2. 先产出计划
3. 自动实现代码
4. 运行测试/校验
5. 结果回告 OpenClaw

项目级命令约定：

- `/deliver`：默认交付主流程（plan -> implement -> validate -> report）
- `/explore`：仅探索需求与风险，不改功能代码
- `/archive`：归档已完成的 OpenSpec 变更

注意：插件运行时入口仍然是 `/cursor` 和 `cursor_agent`。

---

## 功能特性

- **`/cursor` 直连执行**：用户显式触发，路径清晰
- **`cursor_agent` 工具路径**：PI Agent 自动调用能力
- **三种模式**：`ask` / `plan` / `agent`
- **策略控制**：模式降级、关键词允许/拒绝、映射项目约束
- **先计划后开发**：开发任务未放行时强制 `plan`
- **会话持久化**：按项目续接上下文
- **进程安全**：并发控制、超时处理、清理回收

---

## 安装步骤

### 1）安装 Cursor Agent CLI

macOS / Linux：

```bash
curl https://cursor.com/install -fsSL | bash
```

Windows PowerShell：

```powershell
irm https://cursor.com/install | iex
```

验证：

```bash
agent --version
```

### 2）登录认证

```bash
agent login
```

或设置 `CURSOR_API_KEY`。

### 3）在 OpenClaw 中加载插件

源码路径方式：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
    }
  }
}
```

打包安装方式：

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

---

## 最小配置示例

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": {
            "my-project": "/abs/path/to/my-project"
          },
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120,
          "enableMcp": true,
          "enableAgentTool": true,
          "enforcePlanBeforeDevelopment": true
        }
      }
    }
  }
}
```

---

## 使用说明

### `/cursor` 命令格式

```text
/cursor <project> [options] <prompt>
```

可选参数：

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--model <model>`
- `--reset-plan-gate`

示例：

```bash
/cursor my-project --mode ask 解释认证模块架构
/cursor my-project --mode plan 设计缓存方案
/cursor my-project --mode agent 实现 token 刷新逻辑
/cursor my-project --reset-plan-gate
```

---

## 交付回告规范

开发交付的最终回复建议包含：

- `Status`：`SUCCESS | PARTIAL | BLOCKED`
- 任务摘要
- 修改文件与关键变更
- 测试/校验命令与结果
- 是否可交接给 OpenClaw 后续处理

---

## 架构概览

```text
src/
├── index.ts            # 插件入口，注册 /cursor
├── tool.ts             # cursor_agent 工具入口
├── policy.ts           # 模式与计划门控策略
├── runner.ts           # 调用 Cursor CLI 与流处理
├── parser.ts           # stream-json 事件解析
├── formatter.ts        # 输出格式化
├── session-store.ts    # 会话与项目放行状态持久化
├── process-registry.ts # 进程生命周期与并发控制
└── types.ts            # 类型定义
```

调用路径：

- 用户输入 `/cursor` -> command handler -> policy -> runner
- 普通聊天 -> PI Agent 可能调用 `cursor_agent` -> policy -> runner

---

## 开发命令

```bash
npm install
npm run dev
npm run build
npm test
```

---

## 发布前检查

发布前请执行：

- [发布检查清单](docs/release-checklist.md)

---

## 许可证

[Apache-2.0](LICENSE)
# Cursor Agent — OpenClaw 插件

在 OpenClaw 中直接调用本地 Cursor Agent CLI，并通过策略控制实现先计划后开发的交付流程。

[English](README.md) | 中文

---

## 项目简介

`cursor-agent` 是一个 OpenClaw Gateway 插件，用于把聊天中的开发任务桥接到本地 Cursor Agent CLI。

它提供：

- 通过 `/cursor` 直接执行
- 通过 `cursor_agent` 工具自动/回退执行
- 策略门控（开发任务先 plan）
- 会话与项目状态持久化
- 透明输出与可核验结果

---

## 核心工作流

开发类任务推荐流程：

1. 接收 OpenClaw 任务
2. 先产出计划
3. 自动实现代码
4. 运行测试/校验
5. 结果回告 OpenClaw

项目级命令约定：

- `/deliver`：默认交付主流程（plan -> implement -> validate -> report）
- `/explore`：仅探索需求与风险，不改功能代码
- `/archive`：归档已完成的 OpenSpec 变更

注意：插件运行时入口仍然是 `/cursor` 和 `cursor_agent`。

---

## 功能特性

- **`/cursor` 直连执行**：用户显式触发，路径清晰
- **`cursor_agent` 工具路径**：PI Agent 自动调用能力
- **三种模式**：`ask` / `plan` / `agent`
- **策略控制**：模式降级、关键词允许/拒绝、映射项目约束
- **先计划后开发**：开发任务未放行时强制 `plan`
- **会话持久化**：按项目续接上下文
- **进程安全**：并发控制、超时处理、清理回收

---

## 安装步骤

### 1）安装 Cursor Agent CLI

macOS / Linux：

```bash
curl https://cursor.com/install -fsSL | bash
```

Windows PowerShell：

```powershell
irm https://cursor.com/install | iex
```

验证：

```bash
agent --version
```

### 2）登录认证

```bash
agent login
```

或设置 `CURSOR_API_KEY`。

### 3）在 OpenClaw 中加载插件

源码路径方式：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
    }
  }
}
```

打包安装方式：

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

---

## 最小配置示例

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": {
            "my-project": "/abs/path/to/my-project"
          },
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120,
          "enableMcp": true,
          "enableAgentTool": true,
          "enforcePlanBeforeDevelopment": true
        }
      }
    }
  }
}
```

---

## 使用说明

### `/cursor` 命令格式

```text
/cursor <project> [options] <prompt>
```

可选参数：

- `--mode <ask|plan|agent>`
- `--continue`
- `--resume <chatId>`
- `--model <model>`
- `--reset-plan-gate`

示例：

```bash
/cursor my-project --mode ask 解释认证模块架构
/cursor my-project --mode plan 设计缓存方案
/cursor my-project --mode agent 实现 token 刷新逻辑
/cursor my-project --reset-plan-gate
```

---

## 交付回告规范

开发交付的最终回复建议包含：

- `Status`：`SUCCESS | PARTIAL | BLOCKED`
- 任务摘要
- 修改文件与关键变更
- 测试/校验命令与结果
- 是否可交接给 OpenClaw 后续处理

---

## 架构概览

```text
src/
├── index.ts            # 插件入口，注册 /cursor
├── tool.ts             # cursor_agent 工具入口
├── policy.ts           # 模式与计划门控策略
├── runner.ts           # 调用 Cursor CLI 与流处理
├── parser.ts           # stream-json 事件解析
├── formatter.ts        # 输出格式化
├── session-store.ts    # 会话与项目放行状态持久化
├── process-registry.ts # 进程生命周期与并发控制
└── types.ts            # 类型定义
```

调用路径：

- 用户输入 `/cursor` -> command handler -> policy -> runner
- 普通聊天 -> PI Agent 可能调用 `cursor_agent` -> policy -> runner

---

## 开发命令

```bash
npm install
npm run dev
npm run build
npm test
```

---

## 许可证

[Apache-2.0](LICENSE)
# Cursor Agent — OpenClaw 插件

**在 OpenClaw 聊天中直接调用本机 Cursor Agent CLI**

[English](README.md) | 中文

---

> AI 编程的真正力量不在于单一 IDE——而在于将 AI Agent 连接到你的整个工作流中。

## 什么是 Cursor Agent 插件？

**Cursor Agent** 是一个 OpenClaw Gateway 插件，将你的聊天对话与 Cursor Agent CLI 打通。通过简单的 `/cursor` 命令即可对项目进行代码分析、排查和修改——结果原样返回，不经过 LLM 二次总结。

**技术栈：**

* **运行时**: Node.js + TypeScript + ESM
* **构建**: esbuild（单文件打包）
* **平台**: OpenClaw Gateway 插件系统
* **后端**: Cursor Agent CLI（使用你的 Cursor 订阅额度）

## 功能特性

### ⚡ 直接 CLI 调用

通过 `/cursor` 命令零开销地调用 Cursor Agent CLI。

| 特性 | 说明 |
|------|------|
| **结果原样返回** | CLI 输出直接返回——不经 LLM 二次总结 |
| **三种模式** | `agent`（修改文件）、`ask`（只读分析）、`plan`（出方案） |
| **项目映射** | 通过名称映射表快速切换分析目标 |
| **会话管理** | 支持继续或恢复历史分析会话 |
| **上下文加载** | 自动加载 `.cursor/rules`、`AGENTS.md` 等 |

### 🔌 MCP 服务器集成

启用项目配置的 MCP 服务器，拓展分析能力。

| 特性 | 说明 |
|------|------|
| **默认启用** | MCP 服务器默认开启（`--approve-mcps`，不带 `--force`） |
| **灵活接入** | 支持 GitLab、数据库、监控等多种数据源 |
| **按项目配置** | 每个项目可拥有独立的 MCP 配置 |

### 🤖 Agent Tool（兜底调用）

当用户未使用 `/cursor` 命令时，PI Agent 可自动调用 Cursor CLI。

| 特性 | 说明 |
|------|------|
| **自动检测** | PI Agent 自动判断何时需要代码分析 |
| **安全默认** | 默认使用 `ask` 模式（只读），确保安全 |
| **可配置** | 通过 `enableAgentTool` 开关控制 |

### 🛡️ 完善的进程管理

企业级子进程管理，保障运行稳定性。

| 特性 | 说明 |
|------|------|
| **独立进程组** | Unix 上 `detached: true`，避免信号误杀 Gateway |
| **两阶段终止** | SIGTERM → 5 秒 → SIGKILL，优雅退出 |
| **并发控制** | 可配置最大并发 CLI 进程数 |
| **退出清理** | Gateway 退出时自动清理所有子进程 |
| **无输出超时** | 检测长时间无输出的挂死进程 |

## 前置要求

| 依赖 | 说明 |
|------|------|
| Cursor Agent CLI | 需在本机安装 `agent` 命令 |
| Cursor 订阅 | CLI 使用 Cursor 订阅中的模型额度 |
| OpenClaw Gateway | v2026.2.24+ |

## 快速开始

### 1. 安装 Cursor Agent CLI

**Linux / macOS：**

```bash
curl https://cursor.com/install -fsSL | bash
```

可能需要将 `$HOME/.local/bin` 加入 PATH：

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows（PowerShell）：**

```powershell
irm https://cursor.com/install | iex
```

**验证安装：**

```bash
agent --version
```

### 2. 认证登录

```bash
agent login
```

或通过环境变量设置 API Key：

```bash
export CURSOR_API_KEY="your-api-key"
```

### 3. 安装插件

**方式 A：源码路径加载（开发模式）**

在 `~/.openclaw/openclaw.json` 的 `plugins.load.paths` 中添加插件源码路径：

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/cursor-agent"]
    }
  }
}
```

**方式 B：tgz 包安装**

```bash
npm ci && npm run build && npm pack
openclaw plugins install cursor-agent-0.1.0.tgz
```

### 4. 配置

```json
{
  "plugins": {
    "entries": {
      "cursor-agent": {
        "enabled": true,
        "config": {
          "projects": {
            "my-project": "/home/user/projects/my-project",
            "another-project": "/home/user/projects/another"
          },
          "defaultTimeoutSec": 600,
          "noOutputTimeoutSec": 120,
          "enableMcp": true,
          "maxConcurrent": 3,
          "enableAgentTool": true
        }
      }
    }
  }
}
```

### 5. 配置命令授权

`/cursor` 命令默认需要授权（`requireAuth: true`），需要在 OpenClaw 中配置 `commands.allowFrom` 才能正常使用。有两种配置方式：

**方式 A：通过 Control UI 配置（推荐）**

1. 在浏览器中打开 OpenClaw Control UI：`http://127.0.0.1:<port>/config?token=<your-gateway-token>`
2. 在左侧导航栏找到 **Commands** 分类并点击
3. 在右侧找到 **Command Elevated Access Rules** 配置项
4. 点击 **+ Add Entry** 添加一条规则：
   - **Key** 填入渠道 ID（填 `*` 表示所有渠道）
   - 在下方列表点击 **+ Add** 添加允许的发送者 ID（填 `*` 表示所有用户）
5. 点击顶部的 **Save** 保存，然后点击 **Apply** 使配置生效

![Command Elevated Access Rules 配置界面](docs/config-commands-allowfrom.png)

**方式 B：直接编辑配置文件**

在 `~/.openclaw/openclaw.json` 的 `commands` 部分添加 `allowFrom` 字段：

```json
{
  "commands": {
    "allowFrom": {
      "*": ["*"]
    }
  }
}
```

**`allowFrom` 配置说明：**

| Key（渠道 ID） | Value（发送者列表） | 效果 |
|----------------|---------------------|------|
| `"*"` | `["*"]` | 所有渠道的所有用户都可执行需授权的命令 |
| `"*"` | `["user1", "admin"]` | 所有渠道中只有指定用户可执行 |

> **生产环境建议**：上线后将 `allowFrom` 限制为具体的渠道和用户，避免使用 `"*"` 通配符，以确保只有授权人员可以执行代码修改操作。

### 6. 开始使用

```
/cursor my-project 分析认证模块的实现，找出潜在的安全问题
```

## 使用

### 命令格式

```
/cursor <project> [options] <prompt>
```

| 参数 | 说明 |
|------|------|
| `<project>` | 项目名称（映射表中的 key）或绝对路径 |
| `<prompt>` | 分析任务的详细描述 |
| `--mode <mode>` | 运行模式：`ask`（默认）/ `plan` / `agent` |
| `--continue` | 继续上一次会话 |
| `--resume <chatId>` | 恢复指定会话 |

### 示例

```bash
# 只读分析
/cursor my-project --mode ask 解释一下 src/auth 目录的架构设计

# 出方案
/cursor my-project --mode plan 设计一个新的缓存层方案

# 继续上一次会话
/cursor my-project --continue 还有其他安全问题吗？

# 恢复指定会话（会话 ID 在每次执行结果的 footer 中显示）
/cursor my-project --resume abc123 在这个基础上添加单元测试
```

### 查看历史对话

每次执行结果的 footer 会显示会话 ID（如 `💬 97fe5ea8-...`），可通过 `--resume` 继续该对话。

在终端中浏览会话：

```bash
cd /path/to/project
agent ls            # 查看历史会话
agent resume        # 交互式恢复
agent --resume <id> # 恢复指定会话
```

更多用法请参考 [Cursor Agent CLI 文档](https://cursor.com/cn/docs/cli/using)。

## 配置参考

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `projects` | `object` | `{}` | 项目名称到本地绝对路径的映射表 |
| `agentPath` | `string` | 自动检测 | Cursor Agent CLI 的完整路径 |
| `defaultTimeoutSec` | `number` | `600` | 单次调用最大执行时间（秒） |
| `noOutputTimeoutSec` | `number` | `120` | 无输出超时，连续无输出超过此时间判定挂死 |
| `model` | `string` | CLI 默认 | 指定 Cursor Agent 使用的模型 |
| `enableMcp` | `boolean` | `true` | 是否启用 MCP 服务器（`--approve-mcps`） |
| `mcpApprovalMode` | `string` | `approve` | `approve` / `force` / `off` |
| `enableTrust` | `boolean` | `false` | 是否传递 `--trust` 给 CLI |
| `maxConcurrent` | `number` | `3` | 最大并发 Cursor CLI 进程数 |
| `enableAgentTool` | `boolean` | `true` | 注册 Agent Tool 供 PI Agent 自动调用 |
| `commandRequireAuth` | `boolean` | `true` | `/cursor` 是否需要授权 |
| `allowAbsoluteProjectPath` | `boolean` | `false` | 是否允许非映射绝对路径 |
| `toolDefaultMode` | `string` | `agent` | `cursor_agent` 未传 mode 时默认模式 |
| `allowAgentModeForCommand` | `boolean` | `false` | `/cursor` 是否允许 `agent` 模式 |
| `allowAgentModeForTool` | `boolean` | `true` | tool 是否允许 `agent` 模式 |
| `requireMappedProjectForAgent` | `boolean` | `true` | `agent` 模式是否要求项目在映射表中 |
| `writableTaskPatterns` | `string[]` | 内置关键词集 | `agent` 模式关键词白名单 |
| `denyTaskPatterns` | `string[]` | `[]` | `agent` 模式关键词黑名单 |
| `sessionStatePath` | `string` | 自动路径 | 持久化 project-session 映射文件路径 |
| `sessionTtlSec` | `number` | `604800` | 会话映射保留秒数 |
| `maxSessionEntries` | `number` | `200` | 最大持久化映射条数 |

## Agent Tool 与 /cursor 命令的区别

| 特性 | `/cursor` 命令 | Agent Tool |
|------|---------------|------------|
| 触发方式 | 用户显式输入 | PI Agent 自动判断 |
| 结果处理 | 直接返回，不经 LLM | 作为 tool result 返回 |
| 默认模式 | `ask`（默认更安全；可显式切到 `agent`） | `agent`（受策略控制自动化执行） |
| 会话管理 | 支持 --continue/--resume | 不支持 |

启用 Agent Tool：

1. 确保 `enableAgentTool` 为 `true`（默认）
2. 在 OpenClaw 配置的 `tools.allow` 中添加 `cursor_agent` 或 `group:plugins`

## 架构

```
src/
├── index.ts              # 插件入口，注册 /cursor 命令 + cursor_agent 工具
├── types.ts              # 类型定义（配置、事件、命令解析结果）
├── parser.ts             # Cursor Agent stream-json 输出解析
├── runner.ts             # CLI 进程管理、超时控制、事件流收集
├── formatter.ts          # 事件流格式化为 Markdown 输出
├── process-registry.ts   # 全局进程注册表、并发控制、退出清理
└── tool.ts               # Agent Tool 工厂函数
```

### 调用路径

```
用户消息
  ├─ /cursor 命令 ──→ registerCommand handler ──→ runCursorAgent ──→ 结果直接返回用户
  └─ 普通对话 ──→ PI Agent ──→ cursor_agent tool ──→ runCursorAgent ──→ tool result
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（watch）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 打包发布
npm pack
```

## 许可证

[Apache-2.0](LICENSE)
