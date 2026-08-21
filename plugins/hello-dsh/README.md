# dsh-hello-dsh

一个极简的 DeepSeek Harness 插件示例，演示 dsh 插件的基本结构与生命周期契约。

功能极简：加载时打印日志、每 10 秒输出一次心跳、卸载时打印清理日志，并演示 `ctx.effect` 的 disposer 用法。

## 目录结构

```
hello-dsh/
├── package.json        # bundle 清单（声明 dsh.bundle.patch）
├── cordis.patch.yml    # bundle 配置层（name 用包名，供 `dsh plugin add` 正式安装）
├── index.js            # 插件本体（name / apply / ctx.effect）
└── README.md           # 本文档
```

> 本副本从 `deepseek-harness/myPlugins/hello-dsh` 移入 XWork 项目，供 XWork 内置加载。
> 原仓库中的 `hotswap.py` 热插拔脚本未一并移入——XWork 已通过宿主补丁内置本插件，无需该脚本。

## 插件基本结构（index.js）

- `name` — 插件的稳定标识
- `apply(ctx)` — 入口，通过 `ctx` 注册能力
- `ctx.effect()` — 注册 disposer，插件卸载 / 热重载时自动执行清理

> 注：本极简示例未导出 `Config`（插件无需配置）。如需配置，`Config` 必须是 schemastery schema（带 `~standard.validate`），不能是空对象 `{}`，否则 cordis 校验 config 时会报 `Cannot read properties of undefined (reading 'validate')`。

## 在 XWork 中内置安装（当前方式）

本插件已随 XWork 内置：启动 XWork 即自动加载（控制台出现 `[hello-dsh] plugin loaded`，之后每 10 秒一次心跳）。安装由两处应用级配置完成，与任何 profile 目录无关：

- **插件行**：`XWork 项目根/cordis.patch.yml`（宿主补丁层）中的 `hello-dsh` insert 行
- **入口映射**：`src/main/module-resolution.ts` 的模块解析钩子把 `dsh-hello-dsh` 解析到本项目 `plugins/hello-dsh/index.js`（纯 ESM 源码，不参与编译产物）

## 在 XWork 中手动热插拔（可选，调试用）

XWork 的 web 载体与官方一致：启动后会热监听其 profile 的补丁文件 `~/.dsh/profiles/xwork/cordis.patch.yml`。编辑并保存即触发 HMR，无需重启：

```yaml
- insert:
    - id: hello-dsh
      name: dsh-hello-dsh
```

保存即热插入；改回 `[]` 保存即热移除。

> 注意：内置安装已包含该行；此方式主要供临时调试，插入前建议先移除宿主补丁中的对应行，避免重复挂载。

## 官方 Web profile（原仓库工作流）

在官方 dsh CLI 下（`pnpm dsh web`，profile 为 `web`），等效的 profile 补丁路径是 `~/.dsh/profiles/web/cordis.patch.yml`；热插拔脚本见原仓库 `deepseek-harness/myPlugins/hello-dsh/hotswap.py`。

## 许可证

MIT
