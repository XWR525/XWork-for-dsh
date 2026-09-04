// ui-optimization: XWork 桌面 UI 非侵入定制插件。
//
// F1 v1 界面翻译：把官方 UI 残余英文改写为中文。
//
// 为什么是这个形态（决策记录见 doc/UI-Optimization设计文档.md §3.1）：
//   - 残余英文不在应用壳，而在 ui-* client 模块 bundle：zh 字典键齐全但部分值
//     未翻译（A 类），另有组件内硬编码英文拷贝（B 类，绕过 locale 系统）；
//   - 客户端 LocaleRuntime.register 对已存在 (ns, locale) 抛错、无 override API、
//     模块表封闭，字典层覆盖三重封死 → 只能 DOM 层改写；
//   - 因此走 Node 半边：注入 webServer 服务，用 tapIndex 在 index.html 的
//     <head> 里追加一段自包含脚本（数据来自 translations.js，脚本本体是
//     inject-script.js 的 clientScript 函数源码）。脚本用 MutationObserver
//     持续监听，精确匹配文本节点与 placeholder/title/aria-label 属性，
//     插值模板走编译正则；不改官方 UI 源码，不依赖客户端模块系统。
//   - ctx.effect disposer 保证插件卸载/配置热重载时自动撤销注入。
//
// F2/F3 主题配置：纯 CSS 变量覆盖（U2 spike 修订的路线）。Node 侧按 config
// 生成 `<style>`（F3：preset 展开为 body 级 `--dsw-alias-*` 亮暗两套，
// `!important` 压过运行时注入的 token 定义，暗色 attribute 切换自动跟随），
// 与 F1 同点注入。改 profile 层
// cordis.patch.yml 的插件行 config 即热重载换装；页面刷新后取新 HTML。
// 另：设置页「UI Optimization」页签（浏览器半 client.js）可交互选 preset，
// 即时生效并持久化到设置文档（Host 半 settings.register 组合 base 之上）。
//
// 自检：控制台运行 window.__uiOptimizationReport() 查看逐条目命中表
// （0 命中 = 上游改了文案或该页面未访问过）；启动 15s 后自动汇总一次
// 未收录的英文属性值（候选翻译 / 失配线索）。

import Schema from '@deepseek-ai/schemastery'
import { TEXT_MAP, TEMPLATE_MAP } from './translations.js'
import { clientScript } from './inject-script.js'
import { buildThemeCss } from './theme.js'

export const name = 'ui-optimization'

// 注入 webServer：等 HTTP 服务就绪后再注册 index.html 变换。
export const inject = ['webServer']

// F3 配置面（preset：8 套预制配色 + 官方默认，见 presets.js 与设计文档 §3.5）。
// 注意：F3 起移除 palette 自由选色（风格一致性），旧 user 层残余 palette
// 会被新 schema 拒绝 → 自动回落 default。
export const Config = Schema.object({
  theme: Schema.object({
    preset: Schema.union([
      Schema.const('default').description('官方默认（不覆盖）'),
      Schema.const('warm').description('暖木：暖米底 + 琥珀强调'),
      Schema.const('ink').description('石墨：低饱和冷灰 + 蓝青强调'),
      Schema.const('sage').description('苔绿：米灰底 + 深绿强调'),
      Schema.const('violet').description('紫夜：淡紫底 + 琥珀金撞色'),
      Schema.const('ocean').description('碧海：深海蓝 + 珊瑚橙撞色'),
      Schema.const('peach').description('蜜桃：暖粉底 + 莓红强调'),
      Schema.const('moon').description('海月：沁蓝紫底 + 淡紫罗兰强调'),
      Schema.const('pure').description('净华：雾灰底 + 苔绿强调'),
    ]).default('default').description('界面配色预设'),
  }).description('主题覆盖'),
  chatWidth: Schema.object({
    adaptive: Schema.boolean().default(false).description('对话宽度自适应（对话区域随窗口宽度按比例伸缩）'),
    percent: Schema.number().min(50).max(100).default(80).description('对话内容宽度（占主内容区的百分比）'),
  }).description('对话宽度'),
  minimalChat: Schema.boolean().default(false).description('简洁对话（隐藏对话中 AI 侧的工具调用等附属信息，仅保留回复正文与思考）'),
})

// 把字典/模板/运行时配置序列化进 clientScript 源码，得到自包含的 <script>
// 片段。uiConfig 为活值（每次响应对应读取，见 tapIndex）。
function buildReplaceScript(uiConfig) {
  return `<script>(${clientScript.toString()})(${JSON.stringify(Object.entries(TEXT_MAP))}, ${JSON.stringify(Object.entries(TEMPLATE_MAP))}, ${JSON.stringify(uiConfig)})</script>`
}

export function apply(ctx, config = {}) {
  // 主题 CSS 是活值：初始取插件 config；settings 命名空间注册后改以组合
  // scope（base + 用户层持久值）为源，并立即重建一次 —— 否则重启后服务端
  // 拿不到用户已选预设（watch 只在写入时触发），首屏 HTML 无主题样式。
  // tapIndex 变换在每次响应时读取 themeCss，因此重建即对后续页面加载生效；
  // 已加载页面的即时生效由 client.js 卡片订阅 settingsScope 完成。
  let themeSource = () => config
  let themeCss = buildThemeCss(config.theme)
  console.log(`[ui-optimization] plugin loaded at ${new Date().toLocaleTimeString()} (dict: ${Object.keys(TEXT_MAP).length} entries, ${Object.keys(TEMPLATE_MAP).length} templates, theme css: ${themeCss ? themeCss.length + ' chars' : 'off'})`)

  // Host 半侧（U3）：把本插件 config 注册为 settings 命名空间 'ui-optimization'
  // 的 base 层。设置页「插件」分区由此得知该服务此命名空间，浏览器半侧
  // （client.js）以同名键注册的卡片才会被派发渲染。settings 服务由
  // dsh-base 挂载（dsh-settings-file）；未挂载时 ctx.inject 不执行，照常工作。
  // 注意：rc.2 产物没有 provider.installSection（那是文档预写的更新接口），
  // 这里逐行镜像官方消费端助手 installSettingsSection（@deepseek-ai/dsh-settings
  // 导出）的 register + watch 形态，避免为此引入新依赖。
  ctx.inject(['settings'], (settingsCtx) => {
    const scope = settingsCtx.settings.register('ui-optimization', Config, { base: config })
    themeSource = () => scope.get()
    themeCss = buildThemeCss(themeSource().theme)
    scope.watch(() => { themeCss = buildThemeCss(themeSource().theme) })
    console.log(`[ui-optimization] settings namespace 'ui-optimization' registered (settings card enabled)`)
  })

  // 注册 index.html 变换：把翻译脚本与主题样式放进 <head>（client-modules
  // 的启动清单也插在相同位置，各自独立，互不干扰）。返回的 disposer 会随
  // 插件卸载/配置热重载自动移除该变换。
  ctx.effect(() => {
    const dispose = ctx.webServer.tapIndex((html) => {
      const styleTag = themeCss ? `<style data-ui-optimization="theme">${themeCss}</style>` : ''
      const uiConfig = { chatWidth: (themeSource().chatWidth) || {} }
      const scriptTag = buildReplaceScript(uiConfig)
      const head = html.indexOf('<head>')
      if (head === -1) return html + styleTag + scriptTag
      return html.slice(0, head + 6) + styleTag + scriptTag + html.slice(head + 6)
    })
    return () => {
      dispose()
      console.log(`[ui-optimization] plugin disposed at ${new Date().toLocaleTimeString()}`)
    }
  }, 'ui-optimization: F1 translation patch + F2 theme css')
}
