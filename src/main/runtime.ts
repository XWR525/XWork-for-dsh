import { app, BrowserWindow, shell } from 'electron'

/** 原生外壳规格：由 xwork-shell 插件在树挂载后提供。 */
export interface XworkShellSpec {
  url: string
  productName: string
  windowTitle: string
  width: number
  height: number
  requestQuit: (code: number) => void
}

/** 判断原始 URL 是否与期望源不同源。 */
function differentOrigin(rawUrl: string, origin: string): boolean {
  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return true
  }
  return target.origin !== origin
}

/** Electron 实现：由宿主提供的桌面子插件运行时能力（M1 最小窗口集）。 */
export class XworkRuntime {
  private scheduled: XworkShellSpec | undefined
  private mountTask: Promise<void> | undefined
  private release: (() => void) | undefined
  private window: BrowserWindow | undefined
  private teardown: (() => Promise<void>) | undefined
  private quitting = false

  /**
   * 注册插件树释放回调（boot 后由宿主设置），退出前调用以冲刷会话。
   */
  setTeardown(fn: () => Promise<void>): void {
    this.teardown = fn
  }

  /**
   * 有界退出：先释放插件树（冲刷会话）再退出应用；幂等。
   * @param code - 传给 Electron 的退出码。
   */
  quit(code: number): void {
    if (this.quitting) return
    this.quitting = true
    void (async () => {
      try {
        await this.teardown?.()
      } finally {
        app.exit(code)
      }
    })()
  }

  /**
   * 注册原生外壳代；返回的注销函数在树释放时拆除窗口。
   * 由 xwork-shell 插件在树挂载后调用。
   */
  schedule(spec: XworkShellSpec): () => Promise<void> {
    if (this.scheduled !== undefined || this.mountTask !== undefined) {
      throw new Error('xwork-for-dsh: a native shell generation is already registered')
    }
    this.scheduled = spec
    let disposed = false
    return async () => {
      if (disposed) return
      disposed = true
      try {
        await this.mountTask
      } finally {
        try {
          this.release?.()
        } finally {
          this.release = undefined
          this.mountTask = undefined
          if (this.scheduled === spec) this.scheduled = undefined
        }
      }
    }
  }

  /** 挂载已注册的外壳代并等待装载完成（宿主在 boot 后调用）。 */
  mountScheduled(): Promise<void> {
    const spec = this.scheduled
    if (spec === undefined) {
      return Promise.reject(new Error('xwork-for-dsh: the Cordis shell plugin did not register a window'))
    }
    this.mountTask ??= this.mount(spec).then((release) => {
      this.release = release
    })
    return this.mountTask
  }

  /** 显示主窗口（还原最小化并聚焦）。 */
  show(): void {
    const window = this.window
    if (window === undefined || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }

  /** 请求退出（来自渲染器/命令行的 appExit 通道）。 */
  requestQuit(code: number): void {
    this.quit(code)
  }

  private async mount(spec: XworkShellSpec): Promise<() => void> {
    const window = new BrowserWindow({
      title: spec.windowTitle,
      width: spec.width,
      height: spec.height,
      minWidth: 900,
      minHeight: 640,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    })
    this.window = window
    const origin = new URL(spec.url).origin

    const show = (): void => this.show()
    const blockCrossOrigin = (details: Electron.Event<{ url: string }>): void => {
      if (differentOrigin(details.url, origin)) details.preventDefault()
    }
    window.on('page-title-updated', (event) => event.preventDefault())
    window.once('ready-to-show', show)
    app.on('activate', show)
    window.webContents.on('will-frame-navigate', blockCrossOrigin)
    window.webContents.on('will-redirect', blockCrossOrigin)
    window.webContents.on('render-process-gone', (_event, details) => {
      console.error(`xwork-for-dsh: renderer process gone (reason: ${details.reason}, exitCode: ${String(details.exitCode)})`)
    })
    window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) {
        console.error(`xwork-for-dsh: renderer failed to load (${String(errorCode)}: ${errorDescription})`)
      }
    })
    window.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const target = new URL(url)
        if (target.protocol === 'https:' || target.protocol === 'http:' || target.protocol === 'mailto:') {
          void shell.openExternal(target.href)
        }
      } catch {
        // 忽略无效 URL
      }
      return { action: 'deny' }
    })

    await window.loadURL(spec.url)
    return () => {
      app.off('activate', show)
      if (!this.window?.isDestroyed()) this.window?.destroy()
    }
  }
}
