import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

/** 稳定 Cordis 插件名。 */
export const name = 'xwork-shell'

/** 挂载前需要的服务。 */
export const inject = ['webServer', 'webRuntime', 'appExit']

/** 外壳行配置（沿用官方桌面的窗口几何默认值）。 */
export interface XworkShellConfig {
  width?: number
  height?: number
}

/** 宿主提供的桌面子插件运行时能力。 */
interface ShellRuntime {
  schedule(spec: {
    url: string
    productName: string
    windowTitle: string
    width: number
    height: number
    requestQuit: (code: number) => void
  }): () => Promise<void>
}

/**
 * 注册 XWork 原生外壳：从活动 Web 载体值构造渲染器 URL，并通过宿主提供的
 * xworkRuntime 安排 BrowserWindow。
 * @param ctx - 携带 Web 载体与宿主适配器的 Host 上下文。
 * @param config - 校验过的原生窗口值。
 */
export function apply(ctx: Context, config: XworkShellConfig = {}): void {
  const runtime = ctx.get('xworkRuntime') as ShellRuntime | undefined
  if (runtime === undefined) {
    process.stderr.write(
      'xwork-for-dsh: this profile is composed with the XWork shell, which requires the desktop launcher (xworkRuntime).\n'
      + 'Start it with the XWork desktop application.\n',
    )
    return
  }
  const appExit = ctx.get('appExit') as ((code: number) => void) | undefined
  if (appExit === undefined) throw new Error('xwork-for-dsh: the launcher did not provide ctx.appExit')
  if (ctx.webServer.host !== '127.0.0.1') throw new Error('xwork-for-dsh: desktop shell requires a loopback Web server')

  ctx.effect(
    () => runtime.schedule({
      url: `http://127.0.0.1:${String(ctx.webServer.port)}/`,
      productName: 'XWork',
      windowTitle: 'XWork',
      width: config.width ?? 1280,
      height: config.height ?? 840,
      requestQuit: appExit,
    }),
    'xwork-for-dsh: native shell generation',
  )
}
