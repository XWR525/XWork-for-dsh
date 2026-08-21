// hello-dsh: 一个极简的 DeepSeek Harness 插件。
//
// dsh 插件的基本结构：
//   - `name`       : 插件的稳定标识。
//   - `inject`     : （可选）插件依赖的服务；框架会等待这些服务就绪后再调用 `apply`。
//   - `apply(ctx)` : 入口；通过 `ctx` 注册能力，并返回 disposer，使插件在卸载/重载时自动清理。

export const name = 'hello-dsh'

export function apply(ctx) {
  // 用 console.log 打印，避免依赖需要额外注入的 logger 服务，
  // 使插件在任何组合下都能直接激活。
  console.log(`[hello-dsh] plugin loaded at ${new Date().toLocaleTimeString()}`)

  // ctx.effect 注册一个 disposer。返回的函数会在插件卸载或热重载时执行，
  // 从而自动清理资源。
  ctx.effect(() => {
    const timer = setInterval(() => {
      console.log(`[hello-dsh] heartbeat at ${new Date().toLocaleTimeString()}: hello from hello-dsh`)
    }, 10000)

    return () => {
      clearInterval(timer)
      console.log(`[hello-dsh] plugin disposed at ${new Date().toLocaleTimeString()}`)
    }
  })

  // 注释示例——插件如何接入一个真实的 harness 事件：
  //   ctx.on('agent/request', async (data, next) => next())
  // 真实的事件名、payload 与 @mode 参见子系统文档
  // （docs/subsystems/*.md）。选定事件后取消注释并适配即可。
}

// 本插件无需配置，因此不导出 `Config`。cordis 会为导出的 `Config` 校验 config：
// 若导出，它必须是一个 schemastery schema（带 ~standard.validate），空对象 {} 会
// 触发 "Cannot read properties of undefined (reading 'validate')" 报错。
// 需要配置时参见 docs/user/develop/basic/config.md。
