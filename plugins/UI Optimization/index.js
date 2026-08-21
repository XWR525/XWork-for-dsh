// ui-optimization: 一个极简的 XWork 桌面 UI 微调插件。
//
// 功能：把 Web 首页的"探索未至之境"文案改写为"咕咕嘎嘎"。
//
// 为什么这样做：
//   - 首页文案渲染自 ui-conversation 的 locales（key: hero.headline）；
//   - 客户端 LocaleRuntime.register 对已存在的 (ns, locale) 直接抛错，
//     不允许插件覆盖 conversation 命名空间的字典；
//   - 因此本插件走 Node 半边：注入 webServer 服务，用 tapIndex 在
//     index.html 的 <head> 里追加一段自包含脚本。脚本用 MutationObserver
//     监听 DOM，把文本恰好为"探索未至之境"的文本节点改写为"咕咕嘎嘎"，
//     不触碰官方 UI 源码，也不依赖客户端模块系统。

export const name = 'ui-optimization'

// 注入 webServer：等 HTTP 服务就绪后再注册 index.html 变换。
export const inject = ['webServer']

const OLD_HEADLINE = '探索未至之境'
const NEW_HEADLINE = '咕咕嘎嘎'

// 注入到 index.html <head> 的自包含脚本（经典脚本，无外部依赖）。
const REPLACE_SCRIPT = `<script>
(() => {
  const OLD = ${JSON.stringify(OLD_HEADLINE)}
  const NEW = ${JSON.stringify(NEW_HEADLINE)}
  const replaceText = (node) => {
    if (node.nodeType === 3 && node.data === OLD) node.data = NEW
  }
  const walk = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      replaceText(node)
    }
  }
  const onMutations = (mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 3) replaceText(node)
          else if (node.nodeType === 1) walk(node)
        }
      } else if (mutation.type === 'characterData') {
        replaceText(mutation.target)
      }
    }
  }
  const start = () => {
    walk(document.body)
    new MutationObserver(onMutations).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
})()
</script>`

export function apply(ctx) {
  console.log(`[ui-optimization] plugin loaded at ${new Date().toLocaleTimeString()}`)

  // 注册 index.html 变换：把替换脚本放进 <head>（client-modules 的启动清单也
  // 插在相同位置，各自独立，互不干扰）。返回的 disposer 会随插件卸载/热重载
  // 自动移除该变换（同时打印日志，对齐 hello-dsh 的 load/dispose 双日志，
  // 让配置级热卸载在日志里可见）。
  ctx.effect(() => {
    const dispose = ctx.webServer.tapIndex((html) => {
      const head = html.indexOf('<head>')
      if (head === -1) return html + REPLACE_SCRIPT
      return html.slice(0, head + 6) + REPLACE_SCRIPT + html.slice(head + 6)
    })
    return () => {
      dispose()
      console.log(`[ui-optimization] plugin disposed at ${new Date().toLocaleTimeString()}`)
    }
  }, 'ui-optimization: headline rewrite')
}
