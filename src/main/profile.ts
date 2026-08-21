import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  composeEntries,
  initProfile,
  loadOptionalPatches,
  loadOverlayPatches,
  loadProfile,
  PROFILE_PATCH_FILENAME,
  resolveProfileDir,
  type Profile,
} from '@deepseek-ai/dsh-app-boot'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** 诊断前缀。 */
const BIN_NAME = 'xwork-for-dsh'
/** XWork 独立的持久化 profile 名（与官方 desktop/web profile 隔离）。 */
export const XWORK_PROFILE_NAME = 'xwork'
/** XWork profile 内的空 include 根，每次启动重写。 */
const XWORK_PROFILE_ROOT = 'cordis.yml'
/** 官方 Web profile 模板 bundle：XWork 复用的基础层。 */
const XWORK_BUNDLES: readonly string[] = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
/** DSH_TELEMETRY_DISABLED 开关的目标行。 */
const TELEMETRY_ROW_ID = 'session-telemetry-otel'
/** 安装锚点：本包 package.json（编译产物位于 out/main 下，向上两级）。 */
const INSTALL_ANCHOR = fileURLToPath(new URL('../../package.json', import.meta.url))
/** 本包持有的宿主补丁层。 */
const XWORK_PATCH_PATH = fileURLToPath(new URL('../../cordis.patch.yml', import.meta.url))
/** 默认 Web 端口：0 = 由系统分配空闲端口，避免与同机运行的 dsh 冲突。 */
const DEFAULT_XWORK_PORT = 0

/** 一次 XWork profile 组合的结果，交给 boot() 挂载。 */
export interface XworkProfile {
  homeDir: string
  profile: Profile
  rootConfig: string
  bareModuleBaseUrl: string
  patches: PatchOptions[]
  /** HMR 重组合闭包：每次重读 profile/home 用户层后完整重放补丁栈。 */
  composeLive: () => PatchOptions[]
  /** 被热监听的 profile 补丁文件。 */
  liveProfilePatch: string
  /** 被热监听的 home 补丁文件。 */
  liveHomePatch: string
  port: number
}

/** 读取一行条目的对象配置，不信任任意 YAML 值。 */
function rowConfig(row: EntryOptions | undefined): Record<string, unknown> {
  const config = row?.config
  return config !== null && typeof config === 'object' && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {}
}

/** 随 @deepseek-ai/dsh 依赖发布的系统 agent-preset 根。 */
function shippedPresetRoot(): string {
  const dshManifest = createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json')
  return join(dirname(dshManifest), 'config', 'agent-presets')
}

/** 从锚点按 Node 查找顺序解析一个包目录（含 package.json 才算命中）。 */
function packageDirFromAnchor(anchor: string, packageName: string): string | undefined {
  for (const searchPath of createRequire(anchor).resolve.paths(packageName) ?? []) {
    const candidate = join(searchPath, packageName)
    if (existsSync(join(candidate, 'package.json'))) return candidate
  }
  return undefined
}

/** 创建/修正一个 junction 链接（保持与官方 heal 相同的替换与并发语义）。 */
function ensureSymlink(link: string, target: string): void {
  let stat
  try {
    stat = lstatSync(link)
  } catch {
    stat = undefined
  }
  if (stat !== undefined) {
    if (!stat.isSymbolicLink()) {
      throw new Error(`${BIN_NAME}: ${link} exists and is not a symlink; remove it so xwork can manage the installation fallback`)
    }
    if (readlinkSync(link) === target) return
    unlinkSync(link)
  }
  try {
    symlinkSync(target, link, 'junction')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST'
      || !lstatSync(link).isSymbolicLink() || readlinkSync(link) !== target) {
      throw error
    }
  }
}

/**
 * 维护扁平模块 fallback（$DSH_HOME/profiles/node_modules）：安装闭包的每个包
 * 一个链接，任意 profile 经 parent-walk 都能解析到 in-box 插件。
 *
 * 与官方 `healProfilesModuleFallback` 的唯一差异：每个包锚点先 `realpath`。
 * 官方算法在 pnpm 隔离布局下只能解析到应用的直接依赖——顶层包是符号链接，
 * 从字面锚点向上找不到 bundle（dsh-base/dsh-web-app）声明的传递闭包；realpath
 * 后锚点落在 `.pnpm/<pkg>/node_modules`，其下正是 pnpm 物化的全部子依赖，
 * 于是 bundles 声明的整个插件闭包都能建立链接。
 */
function healXworkModuleFallback(installAnchor: string, home: string): void {
  const modulesDir = join(home, 'profiles', 'node_modules')
  mkdirSync(modulesDir, { recursive: true })
  const appManifest = JSON.parse(readFileSync(installAnchor, 'utf8')) as Record<string, unknown>
  const links = new Map<string, string>()
  if (typeof appManifest.name === 'string') links.set(appManifest.name, dirname(installAnchor))
  const queue: { anchor: string; manifest: Record<string, unknown> }[] = [
    { anchor: installAnchor, manifest: appManifest },
  ]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const dep of [
      ...Object.keys((next.manifest.dependencies as Record<string, unknown> | undefined) ?? {}),
      ...Object.keys((next.manifest.peerDependencies as Record<string, unknown> | undefined) ?? {}),
    ]) {
      if (links.has(dep)) continue
      // realpath：pnpm 隔离布局下顶层包是符号链接，字面路径的 node_modules
      // 并不存在；解析必须以真实目录为准（与 Node 内部 realpath 语义一致）。
      const dir = packageDirFromAnchor(realpathSync(next.anchor), dep)
      if (dir === undefined) continue
      links.set(dep, dir)
      const manifestPath = join(dir, 'package.json')
      queue.push({ anchor: manifestPath, manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown> })
    }
  }
  for (const [packageName, target] of links) {
    const link = join(modulesDir, packageName)
    mkdirSync(dirname(link), { recursive: true })
    ensureSymlink(link, target)
  }
}

/**
 * 准备并组合 XWork profile：维护模块 fallback、初始化 profile 目录、
 * 组装补丁栈（bundle 层 + XWork 宿主层 + profile 层 + home 层 + 宿主行补丁）。
 * @param home - Harness home；默认 {@link resolveDshHome}。
 * @returns 根配置、profile 元数据与有序补丁。
 */
export function prepareXworkProfile(home: string = resolveDshHome()): XworkProfile {
  // 维护安装依赖闭包的扁平 fallback（$DSH_HOME/profiles/node_modules）：每个
  // in-box 插件都能通过普通 parent-walk 从任意 profile 解析。
  healXworkModuleFallback(INSTALL_ANCHOR, home)
  // 首次启动时按官方 Web 模板初始化 profile 目录。
  const profileDir = resolveProfileDir(XWORK_PROFILE_NAME, home)
  if (!existsSync(join(profileDir, 'package.json'))) initProfile(profileDir, XWORK_BUNDLES)
  const profile = loadProfile(BIN_NAME, XWORK_PROFILE_NAME, INSTALL_ANCHOR, home)
  const rootConfig = join(profile.dir, XWORK_PROFILE_ROOT)
  // 空根每次重写：整棵组合树都是补丁层，避免 Loader 回写把组合行烘焙进根文件。
  writeFileSync(rootConfig, '[]\n')
  // 本包宿主补丁层：作为 overlay 放在 home 层之后（对齐官方 `--patch` 覆盖层
  // 语义），保证桌面行为（不开浏览器、不打印 URL）不被 profile/home 用户补丁覆盖。
  const xworkPatches = loadOverlayPatches(BIN_NAME, XWORK_PATCH_PATH)
  const bundlePatches = profile.layers.flatMap(layer => layer.patches)
  const homePatchPath = join(home, PROFILE_PATCH_FILENAME)
  const homePatches = loadOptionalPatches(BIN_NAME, homePatchPath) ?? []
  const patches: PatchOptions[] = [...bundlePatches, ...profile.patches, ...homePatches, ...xworkPatches]

  // 组合一次以检查行存在性，与 boot 使用同一 applyEntryPatches 算法。
  const rows = new Map<string, EntryOptions>()
  for (const row of composeEntries([patches])) {
    if (typeof row.id === 'string') rows.set(row.id, row)
  }
  if (!rows.has('webserver')) throw new Error(`${BIN_NAME}: xwork profile has no webserver row`)

  // 宿主追加行（agent-presets 系统预设根、遥测开关）：与 bundle/xwork 层同属
  // 应用层，HMR 重组合时原样重放。
  const appended: PatchOptions[] = []
  // 随 @deepseek-ai/dsh 发布的系统预设根：Web 会话依赖 `standard` 预设。
  const presets = rows.get('agent-presets')
  if (presets !== undefined) {
    appended.push({
      id: 'agent-presets',
      config: {
        ...rowConfig(presets),
        roots: [{ path: shippedPresetRoot(), trust: 'system' }],
      },
    })
  }
  // 遥测开关：任意非空值（含 '0'/'false'）禁用——隐私开关偏误关。
  if ((process.env.DSH_TELEMETRY_DISABLED ?? '') !== '' && rows.has(TELEMETRY_ROW_ID)) {
    appended.push({ id: TELEMETRY_ROW_ID, disabled: true })
  }
  // 注：不 patch webserver 行——rc.8 的 webserver 行由 web-startup 服务驱动，
  // 宿主通过 provideCmdline 传 --host/--port/--no-open（见 index.ts），
  // 与官方 `dsh web` 完全一致。

  // 热监听重组合（对齐官方 composeLive）：bundle 层 + 重读的 profile 层 +
  // 重读的 home 层 + XWork 宿主层 + 宿主追加行。每次重读两个用户文件，且
  // structuredClone 防止 insert 行按引用共享导致补丁覆盖无法回退（官方同款）。
  const composeLive = (): PatchOptions[] => structuredClone([
    ...bundlePatches,
    ...(loadOptionalPatches(BIN_NAME, profile.patchPath) ?? []),
    ...(loadOptionalPatches(BIN_NAME, homePatchPath) ?? []),
    ...xworkPatches,
    ...appended,
  ])

  return {
    homeDir: home,
    profile,
    rootConfig,
    bareModuleBaseUrl: pathToFileURL(join(profile.dir, 'package.json')).href,
    patches: structuredClone(patches),
    composeLive,
    liveProfilePatch: profile.patchPath,
    liveHomePatch: homePatchPath,
    port: DEFAULT_XWORK_PORT,
  }
}
