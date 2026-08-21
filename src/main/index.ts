import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { app } from 'electron'
import { boot, installFailLoud, loadLayeredEnv, watchUserPatches } from '@deepseek-ai/dsh-app-boot'
import type { Context } from '@deepseek-ai/cordis'
import type { ModuleLoader } from '@deepseek-ai/cordis-plugin-loader'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { DSH_LAUNCH_ENVIRONMENT_KEY } from '@deepseek-ai/dsh-launch-environment'
import { installShellEntryResolver, resolveXworkEntry } from './module-resolution'
import { prepareXworkProfile, type XworkProfile } from './profile'
import { XworkRuntime } from './runtime'

const BIN_NAME = 'xwork-for-dsh'

/**
 * cordis FiberState.ACTIVE 的运行时字面量。FiberState 是 const enum，npm 产物中
 * 已被擦除（官方 CLI 能运行时引用是因为 tsdown 打包时内联了值）；cordis 自身
 * 构建产物也用该字面量（`fiber.state !== 2`），此处保持一致。
 */
const FIBER_ACTIVE = 2

/**
 * Electron 主进程的 Node internal loader 占位。Electron 不把 `--expose-internals`
 * 转发进主进程（execArgv 恒空），`node-addon-require-builtin` 也会拒绝非 Node
 * realm——两条官方通路都不可用。HMR 服务的配置热监听路径（watchUserPatches
 * 只用 registerConfig）不依赖 internal 的模块 API，它只在构造检查与 init 的
 * externals 计算（root 为空时恒为空集）被读取；而 loader 的插件导入在 internal
 * 存在时一律走 internal.import。因此占位须提供与兜底等价的 import 与一个空
 * loadCache，让 watch-only HMR 服务可构造且导入行为不变：配置级热重载契约
 * 与官方一致。源码级模块 HMR 在 Electron 主进程不可用（官方 watch-only
 * 实例同样不启用模块重载）。
 */
function createInternalStub(): ModuleLoader {
  return {
    version: 'v2',
    loadCache: new Map(),
    // 镜像 loader 在无 internal 时的兜底导入路径：相对路径以 parentURL 锚定。
    // 裸包名：import.meta.resolve 的 parent 参数在此 Node 构建中被完全忽略，
    // 无法以 baseUrl 为锚；覆盖名（xwork-for-dsh / dsh-hello-dsh）必须显式查
    // 覆盖表（CJS 解析不触发 registerHooks，且会落到 package.json 的 main），
    // 其余裸包名用 createRequire 锚定 profile baseUrl 解析——经
    // healXworkModuleFallback 维护的 $DSH_HOME/profiles/node_modules 扁平目录
    // 覆盖整个安装闭包，与官方 internal.import(name, baseUrl) 语义一致。
    import: async (specifier: string, parentURL: string) => {
      if (specifier.startsWith('.')) return await import(new URL(specifier, parentURL).href)
      const override = resolveXworkEntry(specifier)
      if (override !== undefined) return await import(override)
      const anchor = new URL('package.json', parentURL).href
      return await import(pathToFileURL(createRequire(anchor).resolve(specifier)).href)
    },
  } as unknown as ModuleLoader
}

/** 宿主提供的桌面子插件运行时。 */
const runtime = new XworkRuntime()

/**
 * 安装用户补丁层热监听（对齐官方 `dsh` 的 profile-boot 后置步骤）：
 * 插件树就绪后补建 timer/hmr 服务，再让 watchUserPatches 监听 profile 与
 * home 两个补丁文件；每次变更经 composeLive 事务性重放完整补丁栈。
 * web bundle 禁用了共享 `hmr` 行（其模块重载生命周期未验证），官方同款
 * 处理：挂载 watch-only 实例（root 为空）。
 */
async function installUserPatchWatchers(ctx: Context, prepared: XworkProfile): Promise<void> {
  if (ctx.fiber.state !== FIBER_ACTIVE || ctx.get('loader') === undefined) return
  try {
    if (ctx.get('hmr') === undefined) {
      // 主进程没有可用的 Node internal loader：注入占位使 HMR 服务可构造
      // （配置级热重载不依赖 internal 的模块 API，见 createInternalStub）。
      if (ctx.loader.internal === undefined) {
        ctx.loader.internal = createInternalStub()
      }
      if (ctx.get('timer') === undefined) {
        await ctx.loader.create({ name: '@deepseek-ai/cordis-plugin-timer' })
      }
      await ctx.loader.create({ name: '@deepseek-ai/cordis-plugin-hmr', config: { root: [] } })
    }
    await watchUserPatches(ctx, {
      binName: BIN_NAME,
      filename: prepared.liveProfilePatch,
      compose: prepared.composeLive,
    })
    await watchUserPatches(ctx, {
      binName: BIN_NAME,
      filename: prepared.liveHomePatch,
      compose: prepared.composeLive,
    })
  } catch (error) {
    // 树已在启动窗口内按请求退出（关窗竞态）时静默跳过；否则 watcher 安装
    // 失败必须 fail loud——静默跳过会破坏文档化的热重载契约。
    if (ctx.fiber.state !== FIBER_ACTIVE || ctx.get('loader') === undefined) return
    throw error
  }
}

async function main(): Promise<void> {
  app.setAppUserModelId('com.xwork.dsh')
  await app.whenReady()

  // 1. 准备并组合 profile（bundle 层 + 用户层 + home 层 + XWork 宿主层）。
  const home = resolveDshHome()
  const prepared = prepareXworkProfile(home)

  // 2. 环境快照 + 模块解析钩子（xwork-for-dsh → xwork-shell 入口）。
  const environment = loadLayeredEnv(BIN_NAME, process.cwd())
  const releaseShellResolver = installShellEntryResolver()

  try {
    // 3. boot：挂载插件树（dsh-base + dsh-web-app + xwork-shell）。
    const ctx = await boot(
      BIN_NAME,
      prepared.rootConfig,
      prepared.patches,
      async (hostCtx) => {
        hostCtx.effect(() => releaseShellResolver, `${BIN_NAME}: shell entry resolution`)
        hostCtx.provide(DSH_LAUNCH_ENVIRONMENT_KEY, environment)
        hostCtx.provide('xworkRuntime', runtime)
        // 命令行交接：web-startup 行从中解析 --host/--port/--no-open（与官方
        // `dsh web` 同源）；appExit 供树内请求退出（有界退出：先释放树再退出）。
        provideCmdline(hostCtx, {
          args: ['--host', '127.0.0.1', '--port', String(prepared.port), '--no-open'],
          exit: (code) => runtime.requestQuit(code),
        })
      },
      prepared.bareModuleBaseUrl,
    )
    // 4. 注册插件树释放（退出时冲刷会话），安装用户补丁层热监听，再挂载窗口。
    runtime.setTeardown(() => ctx.fiber.dispose())
    await installUserPatchWatchers(ctx, prepared)
    await runtime.mountScheduled()
  } catch (cause) {
    releaseShellResolver()
    throw cause
  }
}

app.on('activate', () => runtime.show())
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
// 所有退出路径（含关窗）都走有界退出：释放插件树后再退出。
app.on('before-quit', (event) => {
  event.preventDefault()
  runtime.quit(0)
})

// 插件树运行期的未处理拒绝：fail-loud（对齐官方 profile-boot）。
installFailLoud(BIN_NAME, process)

main().catch((cause) => {
  console.error(`${BIN_NAME}: startup failed:`, cause)
  app.exit(1)
})
