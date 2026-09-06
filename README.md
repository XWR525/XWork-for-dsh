# XWork for dsh

> 把 DeepSeek Harness（DSH）的「发动机」装进我们自己的「车壳」。

XWork for dsh 是基于 DeepSeek Harness 插件化运行时（Cordis + `@deepseek-ai/dsh-*` 服务插件 + Web UI bundle）构建的**独立 Electron 桌面客户端**。它不重写 Harness 运行时（agent / 会话 / 工具 / 技能 / 工作流全部复用），而是提供一套属于自己的桌面外壳、品牌与交互，开箱即得 DSH 的完整能力。

- **独立的桌面应用**：拥有自己的 Electron 宿主入口、profile（`xwork`）、窗口与退出生命周期
- **完整 Harness 能力**：复用官方 Web bundle 的 UI 与 agent 会话能力
- **非侵入式定制**：翻译补丁、主题预设、对话布局等全部以插件 + DOM/CSS 层实现，不动上游源码
- **与 DSH 生态共享数据**：沿用 `~/.dsh`（sessions / storages / settings / credentials），与 Web 版互通

## ✨ 特性

- **宿主 + 插件树**架构：应用外壳（Electron 主进程）与 Harness 插件树分离，通过 `boot()` 组装
- **独立 profile**：使用 `xwork` profile（与官方 `desktop` / `web` profile 隔离），底层复用 `@deepseek-ai/dsh-web-app` UI
- **原生窗口壳**：回环 Web 服务 + 沙箱化 BrowserWindow，跨源导航拦截、外链交系统浏览器、有界退出（先冲刷会话再退出）
- **配置级热重载**：监听 profile / home 补丁文件，保存即重放补丁栈，无需重启（与官方 watch-only HMR 契约一致）
- **内置示例插件** `hello-dsh`：演示 Cordis 插件生命周期
- **内置 UI 定制插件** `ui-optimization`：
  - F1 中文界面翻译（字典 + 模板，DOM 层注入，非侵入）
  - F2/F3 主题配色：8 套预制方案（暖木 / 石墨 / 苔绿 / 紫夜 / 碧海 / 蜜桃 / 海月 / 净华），CSS 变量覆盖、亮暗自动跟随、即时生效
  - 对话区域宽度自适应、简洁对话（隐藏工具调用等附属信息）
  - 设置面板独立页签「UI Optimization」，交互配置并持久化
- **Windows 开发便利脚本**：一键清理残留实例 / 陈旧锁并重启

## 🧱 架构

```
┌────────────────────────────────────────────────────────────────┐
│  XWork 宿主（Electron 主进程，非插件）   src/main/               │
│  index.ts              启动流程：环境 → profile → boot → 窗口    │
│  profile.ts            xwork profile 组合 / 模块 fallback 维护    │
│  module-resolution.ts  桌面子插件入口解析钩子（ESM registerHooks） │
│  runtime.ts            XworkRuntime：BrowserWindow 生命周期      │
└───────────────┬────────────────────────────────────────────────┘
                │ boot()（@deepseek-ai/dsh-app-boot）
┌───────────────▼────────────────────────────────────────────────┐
│  Harness 插件树（Cordis @deepseek-ai/cordis）                    │
│  @deepseek-ai/dsh-base        核心服务                           │
│  @deepseek-ai/dsh-web-app     Web UI（官方 Web bundle）          │
│  xwork-shell                  桌面子插件（原生窗口接入）          │
│  ui-optimization              UI 定制插件（翻译 / 主题 / 布局）   │
└───────────────┬────────────────────────────────────────────────┘
                │ 共享数据目录
┌───────────────▼────────────────────────────────────────────────┐
│  ~/.dsh（与 DSH 生态共享）                                       │
│  profiles/xwork · sessions · storages · settings · credentials  │
└────────────────────────────────────────────────────────────────┘
```

### 启动流程

```
app.whenReady()
  → prepareXworkProfile()          // 维护模块 fallback、初始化 xwork profile、组装补丁栈
  → loadLayeredEnv()               // 环境快照
  → installShellEntryResolver()    // 模块解析钩子（覆盖名 → 插件入口）
  → boot()                         // 挂载插件树：dsh-base + dsh-web-app + xwork-shell…
  → installUserPatchWatchers()     // profile / home 补丁文件热监听
  → runtime.mountScheduled()       // 挂载 BrowserWindow 并加载渲染器 URL
```

### 补丁层叠顺序

XWork 沿用了 DSH 的 profile / patch 机制。启动时按序组合：

```
bundle 层（dsh-base、dsh-web-app 的配置补丁）
  → profile 用户补丁层（~/.dsh/profiles/xwork/cordis.patch.yml）
  → 机器级（home）补丁层（~/.dsh/cordis.patch.yml）
  → XWork 宿主补丁层（项目根 cordis.patch.yml，overlay 语义，保证桌面行为不被覆盖）
```

`cordis.patch.yml`（宿主层）负责：insert `xwork-shell`、`ui-optimization` 两个桌面子插件；关闭 web-runtime 的开浏览器与打印 URL 行为（桌面版没有终端 operator）。

## 📦 技术栈

| 项 | 选择 | 说明 |
|---|---|---|
| 运行时 | Node.js `^22.19.0 \|\| >=24.0.0` | DSH 引擎要求 |
| 包管理 | pnpm 11.x（Corepack 固定） | workspace + `patchedDependencies` |
| 桌面框架 | Electron 43.x | 与 DSH 生态一致（原生模块 ABI 兼容） |
| 构建 | electron-vite 5 + TypeScript（strict） | 主进程双入口产物 |
| 宿主/内核 | `@deepseek-ai/dsh-app-boot`、`@deepseek-ai/cordis` | 复用官方运行时，不重写 |
| UI | `@deepseek-ai/dsh-web-app` Web bundle | 复用官方界面 |
| DSH 基线 | `@deepseek-ai/dsh@0.1.1-rc.2` 版本族 | 与官方版本锁定一致 |

## 🗂 目录结构

```
XWork-for-dsh/
├─ src/main/                      # Electron 主进程（宿主，编译产物 out/main/）
│  ├─ index.ts                    # 启动流程入口
│  ├─ profile.ts                  # prepareXworkProfile：profile 组合 + 模块 fallback
│  ├─ module-resolution.ts        # 桌面子插件名 → 入口的解析钩子
│  ├─ runtime.ts                  # XworkRuntime：窗口创建 / 退出管理
│  └─ xwork-shell.ts              # 桌面子插件（宿主补丁 insert，独立产物入口）
├─ plugins/
│  ├─ hello-dsh/                  # 内置示例插件 dsh-hello-dsh（纯 ESM 源码）
│  └─ UI Optimization/            # 内置 UI 定制插件 ui-optimization
├─ patches/                       # pnpm patchedDependencies（koffi / Node≥24 兼容修复）
├─ doc/设计文档.md                 # 架构与里程碑设计文档（本地草稿，不入库）
├─ cordis.patch.yml               # XWork 宿主补丁层
├─ electron.vite.config.ts        # electron-vite 配置（index + xwork-shell 双入口）
├─ pnpm-workspace.yaml            # overrides / allowBuilds / patchedDependencies
└─ restart-xwork-dsh.bat          # Windows 开发：清理残留实例并重启
```

## 🚀 快速开始

### 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- pnpm（Corepack 固定 `pnpm@11.25.0`）
- 建议新版本 Node（`C:\Program Files\nodejs`），nvm4w 默认的 Node 22.x 可能不满足 engines 要求

### 安装

```bash
corepack enable
pnpm install
```

> `.npmrc` 已配置国内镜像（registry / Electron 二进制），无需手动设置。

### 开发

```bash
pnpm run dev        # electron-vite dev，启动 XWork 桌面应用
```

### 类型检查与构建

```bash
pnpm run typecheck  # tsc --noEmit（strict）
pnpm run build      # 产出 out/main/index.js 与 out/main/xwork-shell.js
pnpm start          # electron-vite preview，预览构建产物
```

### Windows 一键重启

```powershell
.\restart-xwork-dsh.bat
```

依次执行：杀掉本项目的残留 electron / electron-vite 进程树 → 删除陈旧 settings 锁 → `pnpm dev`。应用进入异常状态时可随时重复执行，兼作重置开关。

## ⚙️ 配置与数据

- **DSH home**：由 `@deepseek-ai/dsh-home-paths` 解析，默认 `~/.dsh`，与 DSH 生态共享
- **XWork profile**：`~/.dsh/profiles/xwork/`（首次启动按官方 Web 模板初始化，bundle 为 `dsh-base` + `dsh-web-app`）
- **空 include 根**：`cordis.yml` 每次启动重写为 `[]`，组合树全部由补丁层构成，避免 Loader 回写把组合行烘焙进根文件
- **模块 fallback**：宿主维护 `~/.dsh/profiles/node_modules` 扁平符号链接，覆盖整个安装闭包（含项目内源码插件），保证任意 profile 经 parent-walk 都能解析到 in-box 插件
- **端口**：默认 `0`（由系统分配空闲端口），避免与同机运行的官方 `dsh` 冲突；命令行以 `--host 127.0.0.1 --port … --no-open` 交接给 web-startup
- **遥测**：环境变量 `DSH_TELEMETRY_DISABLED` 为非空即禁用（隐私开关偏误关）

### 用户补丁热重载

启动后宿主会热监听两处补丁文件，编辑保存即事务性重放完整补丁栈（配置级热重载，与官方 watch-only HMR 契约一致）：

- `~/.dsh/profiles/xwork/cordis.patch.yml`（profile 用户层）
- `~/.dsh/cordis.patch.yml`（home 机器级）

> 例如在 profile 补丁中 `insert` 一行 `dsh-hello-dsh` 即可热插入示例插件，改回 `[]` 保存即热移除（详见 `plugins/hello-dsh/README.md`）。注意：主进程没有 Node internal loader，源码级模块热重载不可用（与官方 watch-only 实例行为一致）。

### 原生窗口行为

- 默认 1280 × 840（最小 900 × 640），`contextIsolation` / `sandbox` / `webSecurity` 全开，仅回环 Web 服务（强制 `127.0.0.1`）
- 阻止跨源导航与重定向；`window.open` 的 http / https / mailto 链接交给系统浏览器
- 渲染进程崩溃 / 加载失败会输出错误日志
- 所有退出路径（含关窗）为**有界退出**：先释放插件树（冲刷会话）再退出

## 🧩 内置插件

| 插件 | 包名/标识 | 说明 |
|---|---|---|
| XWork 外壳 | `xwork-for-dsh` → `xwork-shell` | 从活动 Web 载体值构造窗口，通过宿主 `xworkRuntime` 调度原生窗口（宿主补丁自动装载） |
| UI 优化 | `ui-optimization` | 中文翻译、8 套配色预设、对话宽度自适应、简洁对话；设置页「UI Optimization」页签可交互配置并持久化到 settings 命名空间 `ui-optimization` |
| 示例插件 | `dsh-hello-dsh` | 极简 Cordis 插件示例：加载/卸载日志 + 10s 心跳，演示 `name` / `apply` / `ctx.effect` |

## 🧭 现状与路线图

对照 `doc/设计文档.md` 的里程碑：

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M0 | 环境就绪（Node + pnpm + 骨架） | ✅ 完成 |
| M1 | 最小可运行：宿主 + 窗口 + `dsh-web-app` UI + 可发起会话 | ✅ 完成 |
| — | 桌面子插件 `xwork-shell`、示例插件、UI 定制插件内置 | ✅ 完成 |
| M2 | 托盘、窗口管理、日志/诊断导出 | ⏳ 后续迭代 |
| M3 | 内置终端、XWork 设置面板 | ⏳ 后续迭代 |
| M4 | electron-builder 打包分发（NSIS 安装包） | ⏳ 后续迭代 |
| M5 | `dsh plugin` 第三方插件生态落地验证 | ⏳ 后续迭代 |

### 非目标

不重写 Harness 运行时；不做官方同款自动更新与安装恢复体系；不承诺与 DSH Desktop 二进制级兼容。

## 📄 相关文档

- `doc/设计文档.md` — 背景、架构与里程碑（本地草稿，未纳入版本控制）
- `plugins/hello-dsh/README.md` — 示例插件结构与内置/热插拔方式
- `plugins/UI Optimization/` — UI 定制插件的机制说明（源码内注释含设计决策）

## 📝 License

[MIT](./package.json)
