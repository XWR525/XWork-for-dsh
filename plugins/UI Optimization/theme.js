// F2/F3 主题配置 → 注入 CSS 的生成逻辑。
//
// 路线（U2 spike 定案，见 doc/UI-Optimization设计文档.md §3.2.3）：纯 CSS 变量
// 覆盖——`<style>` 中 `body { --dsw-*: … !important }` / `body[data-ds-dark-theme]
// { … !important }`。CSS 级联规则保证 important author 声明压过运行时注入的
// token 定义，暗色 attribute 切换自动跟随。
//
// F3（§3.5）：配色不再自由选色，改为 6 套预制方案（presets.js 的 PRESETS）；
// 每套只覆盖 alias 语义层的主轴面（底色/文字/品牌/按钮/交互/功能态/代码块），
// 亮暗两套。无可生效配置（preset='default'）时返回空串。

import { PRESETS } from './presets.js'

/**
 * 把 Config.theme 编译为一段完整 CSS；无可生效配置时返回空串。
 * @param theme - {{ preset?: 'default'|'warm'|'ink'|'sage' }}
 */
export function buildThemeCss(theme = {}) {
  const blocks = []

  // F3：preset 直接展开为 alias 覆盖（default 不注入）。
  const preset = PRESETS[theme.preset]
  if (preset) {
    const presetToCss = (tokens) => {
      const decls = Object.entries(tokens).map(([k, v]) => `${k}: ${v} !important;`)
      // 派生别名：把「未入预设面」的表面/按钮语义 token 指到预设已覆盖的同
      // 义 token（var() 引用同一 body 上被覆盖的值，亮暗自动跟随）。
      //   新会话按钮面  → layer-1（surface 层）
      //   输入区辅助(+)  → module-platform（同 sidebar 思路）
      //   发送按钮       → 品牌色 + 品牌 hover 档
      decls.push('--dsw-alias-button-elevated-fill: var(--dsw-alias-bg-layer-1) !important;')
      decls.push('--dsw-specific-selector: var(--dsw-alias-bg-module-platform) !important;')
      decls.push('--dsw-alias-button-info-fill: var(--dsw-alias-brand-primary) !important;')
      decls.push('--dsw-alias-button-info-hover: var(--dsw-alias-button-primary-hover) !important;')
      decls.push('--dsw-specific-tip: var(--dsw-alias-bg-module-platform) !important;')
      decls.push('--dsw-specific-bubble: var(--dsw-alias-state-business-tertiary) !important;')
      // 新会话按钮 hover → 品牌强调淡档（与底色拉开，体现强调）；设置页签
      // hover/选中 → layer-3 / overlay（选中比 hover 深一档，延续同色相派生）。
      decls.push('--dsw-alias-button-floating-hover: var(--dsw-alias-button-primary-dimmed) !important;')
      decls.push('--dsw-specific-sidebar-nav-item-hover: var(--dsw-alias-bg-layer-3) !important;')
      decls.push('--dsw-specific-sidebar-nav-item-active: var(--dsw-alias-bg-overlay) !important;')
      decls.push('--dsw-specific-sidebar-nav-item-active-accent: var(--dsw-alias-interactive-bg-hover) !important;')
      // 弱化描边/禁用文字档（插件卡展开与 hover 的描边用它）：指到 border-l2
      // （半透明黑/白），使展开态描边与折叠态同观感，不会在彩色底上浮出官方
      // 固定蓝灰（#e1e5ee）；disabled 文字保持同档弱化。
      decls.push('--dsw-alias-label-dimmed: var(--dsw-alias-border-l2) !important;')
      return decls.join(' ')
    }
    if (Object.keys(preset.light).length) blocks.push(`body { ${presetToCss(preset.light)} }`)
    if (Object.keys(preset.dark).length) blocks.push(`body[data-ds-dark-theme] { ${presetToCss(preset.dark)} }`)
    // 设置-通用设置-外观的主题色块（浅色/深色/跟随系统）：官方 hover 走共享的
    // interactive-bg-hover（浅色档 8% 透明的品牌色在这类大按钮上几乎不可见），
    // 用稳定后缀类名单独指到品牌浅档，使其明显跟随主题；选中态不受影响。
    blocks.push(`[class*="_themeCube"]:hover:not([class*="_selected"]) { background: var(--dsw-alias-button-primary-dimmed) !important; }`)
  }

  return blocks.join('\n')
}