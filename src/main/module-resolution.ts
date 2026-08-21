import { registerHooks } from 'node:module'

/**
 * 针对 Electron 受限 Node 运行时的桌面子插件入口映射。
 *
 * rc.8 官方机制（`dsh-app-boot` 的 `mountRootInclude`）已把 Loader 的裸包名
 * 解析交给 `loader.internal.import(specifier, bareModuleBaseUrl)`，因此本钩子
 * 只保留官方机制无法覆盖的三处：
 * - `xwork-for-dsh` → 本包桌面子插件入口 `xwork-shell`（正常包解析会落到
 *   package.json 的 `main`，即 Electron 宿主入口，而非插件入口）。
 * - `dsh-hello-dsh` → 本包内置的 hello-dsh 示例插件（插件本体是未打包的
 *   纯 ESM 源码，不参与编译产物，映射到项目内 plugins/hello-dsh 源文件）。
 * - `ui-optimization` → 项目内 plugins/UI Optimization 源插件（同为未打包的
 *   纯 ESM 源码，映射到项目内 plugins/UI Optimization/index.js）。
 */

/** 本包桌面子插件入口（与宿主产物同目录的独立文件）。 */
const XWORK_ENTRY_URL = new URL('./xwork-shell.js', import.meta.url).href

/** 内置 hello-dsh 插件入口（项目根 plugins/hello-dsh/index.js）。 */
const HELLO_DSH_ENTRY_URL = new URL('../../plugins/hello-dsh/index.js', import.meta.url).href

/** UI Optimization 插件入口（项目根 plugins/UI Optimization/index.js）。 */
const UI_OPTIMIZATION_ENTRY_URL = new URL('../../plugins/UI Optimization/index.js', import.meta.url).href

/** 桌面子插件名 → 入口：模块解析钩子按此表重定向。 */
const ENTRY_OVERRIDES: Readonly<Record<string, string>> = {
  'xwork-for-dsh': XWORK_ENTRY_URL,
  'dsh-hello-dsh': HELLO_DSH_ENTRY_URL,
  'ui-optimization': UI_OPTIMIZATION_ENTRY_URL,
}

/**
 * 返回桌面子插件名对应的入口 URL；未覆盖时返回 undefined。
 * 供 internal stub 的裸包名导入复用同一张覆盖表（CJS 解析不触发
 * registerHooks 钩子，覆盖名必须显式查表，否则会落到 package.json 的
 * main 或直接解析失败）。
 */
export function resolveXworkEntry(specifier: string): string | undefined {
  return ENTRY_OVERRIDES[specifier]
}

/**
 * 把 Loader 请求的桌面子插件裸包名映射到对应的插件入口。
 * @returns 幂等的钩子注销函数。
 */
export function installShellEntryResolver(): () => void {
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const override = ENTRY_OVERRIDES[specifier]
      if (override !== undefined) {
        return { shortCircuit: true, url: override }
      }
      return nextResolve(specifier, context)
    },
  })
  let active = true
  return () => {
    if (!active) return
    active = false
    hooks.deregister()
  }
}
