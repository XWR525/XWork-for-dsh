// ui-optimization 浏览器半侧：设置面板的独立页签「UI Optimization」（U4 + F3）。
//
// 形态 = 手写的客户端模块 bundle，复刻官方 lazy-CJS factory 产物信封
// （见 doc/dsh-official-docs/cookbook/adding-a-settings-card.zh.md）：
//   - window.__ModuleLoader__.load({ id, factory }) 信封，factory 内唯一
//     允许的值依赖是模块图种子（react / react/jsx-runtime）；
//   - 导出 { inject, apply }，客户端 cordis runner 注入服务后调用 apply；
//   - 注册进 list slot `settings.section`（id `ui-optimization`，order 21 =
//     agent-presets(20) 之后）：导航紧跟「Agent 预设」出现；
//   - 表单经 ctx.settingsScope.bind({ namespace: 'ui-optimization' }) 读写，
//     getSnapshot/subscribe 恰好是 useSyncExternalStore 需要的 Observable。
//
// F3 起（§3.5）：配色不再自由选色 —— 页面只提供 4 张「配色方案」预设卡
// （官方默认 / 暖木 / 石墨 / 苔绿）单选；取色器与圆角下拉已移除。
//
// 「改动即时生效」：表单订阅 scope，把快照 theme 的 preset 展开成与
// 宿主侧 theme.js 相同的 CSS 覆盖段，改写页面 <style data-ui-optimization="theme">
// （宿主 tapIndex 注入同款标签；不存在则创建）。编译器与 PRESETS 表是
// theme.js/presets.js 的有意镜像 —— bundle 纯净度门禁禁止引用宿主代码，
// 两半各持一份（改动需同步）。
//
// 文案硬编码中文（页签名「UI Optimization」保留英文）。

window.__ModuleLoader__.load({
  id: 'ui-optimization',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const react = require('react');
    const jsxRuntime = require('react/jsx-runtime');
    const jsx = jsxRuntime.jsx;

    /** settings 命名空间（与 index.js 的 settings.register 第一参一致）。 */
    const NS = 'ui-optimization';
    /** 宿主与页面共用的主题 <style> 标签选择器。 */
    const STYLE_TAG = 'style[data-ui-optimization="theme"]';

    // —— PRESETS 镜像（与 plugins/UI Optimization/presets.js 同步维护）——

    const PRESETS = {
      warm: {
        label: '暖木', desc: '暖米底色 + 琥珀焦橙强调，偏温和的阅读氛围。', chips: ['#f3e7d3', '#c2410c', '#2e261c'],
        light: {
          '--dsw-alias-bg-base': '#fdf6ee', '--dsw-alias-bg-layer-1': '#faf0e3', '--dsw-specific-input-major': '#faf0e3', '--dsw-alias-bg-layer-2': '#f5e9d6', '--dsw-alias-bg-layer-3': '#f0e1c9', '--dsw-alias-bg-module-platform': '#f3e7d3', '--dsw-specific-sidebar-fill': '#f3e7d3', '--dsw-alias-bg-overlay': '#e7d6ba', '--dsw-alias-bg-multi-select': '#f5e9d6',
          '--dsw-alias-label-primary': '#26201a', '--dsw-alias-label-secondary': '#6d6155', '--dsw-alias-label-tertiary': '#8f8273', '--dsw-alias-label-caption': '#ab9d8d',
          '--dsw-alias-brand-primary': '#c2410c', '--dsw-alias-brand-text': '#c2410c', '--dsw-alias-button-primary-fill': '#c2410c', '--dsw-alias-button-primary-hover': '#9a3412', '--dsw-alias-button-primary-dimmed': '#faddc3', '--dsw-alias-button-contrast-fill': '#26201a', '--dsw-alias-state-business-primary': '#c2410c', '--dsw-alias-state-business-tertiary': '#fae6d2',
          '--dsw-alias-interactive-bg-hover': '#c2410c14', '--dsw-alias-interactive-bg-active': '#c2410c1f', '--dsw-alias-interactive-bg-hover-solid': '#f5e9d6', '--dsw-alias-markdown-code-block': '#faf0e3', '--dsw-alias-markdown-code-block-banner': '#faf0e3', '--dsw-alias-markdown-inline-code': '#f4e7d3', '--dsw-alias-tooltip-bg': '#3a3027',
        },
        dark: {
          '--dsw-alias-bg-base': '#201a14', '--dsw-alias-bg-layer-1': '#2a221a', '--dsw-specific-input-major': '#2a221a', '--dsw-alias-bg-layer-2': '#332a20', '--dsw-alias-bg-layer-3': '#3c3125', '--dsw-alias-bg-module-platform': '#2e261c', '--dsw-specific-sidebar-fill': '#2e261c', '--dsw-alias-bg-overlay': '#45382b', '--dsw-alias-bg-multi-select': '#2a221a',
          '--dsw-alias-label-primary': '#f5efe6', '--dsw-alias-label-secondary': '#c9bda8', '--dsw-alias-label-tertiary': '#9f9180', '--dsw-alias-label-caption': '#857868',
          '--dsw-alias-brand-primary': '#fb923c', '--dsw-alias-brand-text': '#fb923c', '--dsw-alias-button-primary-fill': '#fb923c', '--dsw-alias-button-primary-hover': '#f59e0b', '--dsw-alias-button-primary-dimmed': '#4a2f1b', '--dsw-alias-button-contrast-fill': '#f5efe6', '--dsw-alias-state-business-primary': '#fb923c', '--dsw-alias-state-business-tertiary': '#3b2b1c',
          '--dsw-alias-interactive-bg-hover': '#fb923c26', '--dsw-alias-interactive-bg-active': '#fb923c33', '--dsw-alias-interactive-bg-hover-solid': '#2a221a', '--dsw-alias-markdown-code-block': '#2a221a', '--dsw-alias-markdown-code-block-banner': '#2a221a', '--dsw-alias-markdown-inline-code': '#362c21', '--dsw-alias-tooltip-bg': '#4a3f35',
        },
      },
      ink: {
        label: '石墨', desc: '低饱和冷灰底色 + 蓝青强调，冷静克制的工具风格。', chips: ['#e9edf1', '#2563eb', '#282d33'],
        light: {
          '--dsw-alias-bg-base': '#f4f6f8', '--dsw-alias-bg-layer-1': '#eef1f4', '--dsw-specific-input-major': '#eef1f4', '--dsw-alias-bg-layer-2': '#e8ecf0', '--dsw-alias-bg-layer-3': '#e2e7ec', '--dsw-alias-bg-module-platform': '#e9edf1', '--dsw-specific-sidebar-fill': '#e9edf1', '--dsw-alias-bg-overlay': '#d7dee5', '--dsw-alias-bg-multi-select': '#e8ecf0',
          '--dsw-alias-label-primary': '#191d21', '--dsw-alias-label-secondary': '#5a636d', '--dsw-alias-label-tertiary': '#7d8792', '--dsw-alias-label-caption': '#9aa3ad',
          '--dsw-alias-brand-primary': '#2563eb', '--dsw-alias-brand-text': '#2563eb', '--dsw-alias-button-primary-fill': '#2563eb', '--dsw-alias-button-primary-hover': '#1d4ed8', '--dsw-alias-button-primary-dimmed': '#dbe6fe', '--dsw-alias-button-contrast-fill': '#191d21', '--dsw-alias-state-business-primary': '#2563eb', '--dsw-alias-state-business-tertiary': '#e0e9fe',
          '--dsw-alias-interactive-bg-hover': '#2563eb14', '--dsw-alias-interactive-bg-active': '#2563eb1f', '--dsw-alias-interactive-bg-hover-solid': '#e8ecf0', '--dsw-alias-markdown-code-block': '#eef1f4', '--dsw-alias-markdown-code-block-banner': '#eef1f4', '--dsw-alias-markdown-inline-code': '#e3e9f2', '--dsw-alias-tooltip-bg': '#2f363e',
        },
        dark: {
          '--dsw-alias-bg-base': '#14171a', '--dsw-alias-bg-layer-1': '#1d2126', '--dsw-specific-input-major': '#1d2126', '--dsw-alias-bg-layer-2': '#262b31', '--dsw-alias-bg-layer-3': '#2f343b', '--dsw-alias-bg-module-platform': '#282d33', '--dsw-specific-sidebar-fill': '#282d33', '--dsw-alias-bg-overlay': '#363c44', '--dsw-alias-bg-multi-select': '#1d2126',
          '--dsw-alias-label-primary': '#eef1f4', '--dsw-alias-label-secondary': '#b9c1ca', '--dsw-alias-label-tertiary': '#8b96a1', '--dsw-alias-label-caption': '#77818c',
          '--dsw-alias-brand-primary': '#60a5fa', '--dsw-alias-brand-text': '#60a5fa', '--dsw-alias-button-primary-fill': '#60a5fa', '--dsw-alias-button-primary-hover': '#3b82f6', '--dsw-alias-button-primary-dimmed': '#1e3a5f', '--dsw-alias-button-contrast-fill': '#eef1f4', '--dsw-alias-state-business-primary': '#60a5fa', '--dsw-alias-state-business-tertiary': '#22334d',
          '--dsw-alias-interactive-bg-hover': '#60a5fa26', '--dsw-alias-interactive-bg-active': '#60a5fa33', '--dsw-alias-interactive-bg-hover-solid': '#1d2126', '--dsw-alias-markdown-code-block': '#1d2126', '--dsw-alias-markdown-code-block-banner': '#1d2126', '--dsw-alias-markdown-inline-code': '#252b31', '--dsw-alias-tooltip-bg': '#3a4249',
        },
      },
      sage: {
        label: '苔绿', desc: '米灰偏绿底色 + 深绿强调，自然柔和的低刺激配色。', chips: ['#eaeedf', '#2f855a', '#242c21'],
        light: {
          '--dsw-alias-bg-base': '#f6f8f4', '--dsw-alias-bg-layer-1': '#f0f3ec', '--dsw-specific-input-major': '#f0f3ec', '--dsw-alias-bg-layer-2': '#e8ecdf', '--dsw-alias-bg-layer-3': '#e0e6d3', '--dsw-alias-bg-module-platform': '#eaeedf', '--dsw-specific-sidebar-fill': '#eaeedf', '--dsw-alias-bg-overlay': '#d9e0ca', '--dsw-alias-bg-multi-select': '#e8ecdf',
          '--dsw-alias-label-primary': '#1f261c', '--dsw-alias-label-secondary': '#5f6857', '--dsw-alias-label-tertiary': '#818b78', '--dsw-alias-label-caption': '#9aa391',
          '--dsw-alias-brand-primary': '#2f855a', '--dsw-alias-brand-text': '#2f855a', '--dsw-alias-button-primary-fill': '#2f855a', '--dsw-alias-button-primary-hover': '#276749', '--dsw-alias-button-primary-dimmed': '#dcebde', '--dsw-alias-button-contrast-fill': '#1f261c', '--dsw-alias-state-business-primary': '#2f855a', '--dsw-alias-state-business-tertiary': '#e0ece1',
          '--dsw-alias-interactive-bg-hover': '#2f855a14', '--dsw-alias-interactive-bg-active': '#2f855a1f', '--dsw-alias-interactive-bg-hover-solid': '#e8ecdf', '--dsw-alias-markdown-code-block': '#f0f3ec', '--dsw-alias-markdown-code-block-banner': '#f0f3ec', '--dsw-alias-markdown-inline-code': '#e6ecdb', '--dsw-alias-tooltip-bg': '#2e372b',
        },
        dark: {
          '--dsw-alias-bg-base': '#121710', '--dsw-alias-bg-layer-1': '#1a2017', '--dsw-specific-input-major': '#1a2017', '--dsw-alias-bg-layer-2': '#222a1f', '--dsw-alias-bg-layer-3': '#2b3427', '--dsw-alias-bg-module-platform': '#242c21', '--dsw-specific-sidebar-fill': '#242c21', '--dsw-alias-bg-overlay': '#343d2f', '--dsw-alias-bg-multi-select': '#1a2017',
          '--dsw-alias-label-primary': '#eef2ea', '--dsw-alias-label-secondary': '#bdc6b2', '--dsw-alias-label-tertiary': '#929d85', '--dsw-alias-label-caption': '#7e8a72',
          '--dsw-alias-brand-primary': '#48bb78', '--dsw-alias-brand-text': '#48bb78', '--dsw-alias-button-primary-fill': '#48bb78', '--dsw-alias-button-primary-hover': '#34d399', '--dsw-alias-button-primary-dimmed': '#1c3627', '--dsw-alias-button-contrast-fill': '#eef2ea', '--dsw-alias-state-business-primary': '#48bb78', '--dsw-alias-state-business-tertiary': '#213527',
          '--dsw-alias-interactive-bg-hover': '#48bb7826', '--dsw-alias-interactive-bg-active': '#48bb7833', '--dsw-alias-interactive-bg-hover-solid': '#1a2017', '--dsw-alias-markdown-code-block': '#1a2017', '--dsw-alias-markdown-code-block-banner': '#1a2017', '--dsw-alias-markdown-inline-code': '#222a1f', '--dsw-alias-tooltip-bg': '#39442f',
        },
      },
      violet: {
        label: '紫夜', desc: '淡紫底 + 琥珀金强调，紫金撞色的夜间氛围。', chips: ['#ece6f4', '#b45309', '#231d2e'],
        light: {
          '--dsw-alias-bg-base': '#f7f4fb', '--dsw-alias-bg-layer-1': '#f1ecf7', '--dsw-specific-input-major': '#f1ecf7', '--dsw-alias-bg-layer-2': '#e9e2f2', '--dsw-alias-bg-layer-3': '#e1d8ec', '--dsw-alias-bg-module-platform': '#ece6f4', '--dsw-specific-sidebar-fill': '#ece6f4', '--dsw-alias-bg-overlay': '#d5c9e2', '--dsw-alias-bg-multi-select': '#e9e2f2',
          '--dsw-alias-label-primary': '#231d2e', '--dsw-alias-label-secondary': '#5f5471', '--dsw-alias-label-tertiary': '#827493', '--dsw-alias-label-caption': '#a292b3',
          '--dsw-alias-brand-primary': '#b45309', '--dsw-alias-brand-text': '#b45309', '--dsw-alias-button-primary-fill': '#b45309', '--dsw-alias-button-primary-hover': '#92400e', '--dsw-alias-button-primary-dimmed': '#fbe7d0', '--dsw-alias-button-contrast-fill': '#231d2e', '--dsw-alias-state-business-primary': '#b45309', '--dsw-alias-state-business-tertiary': '#fdeed8',
          '--dsw-alias-interactive-bg-hover': '#b4530914', '--dsw-alias-interactive-bg-active': '#b453091f', '--dsw-alias-interactive-bg-hover-solid': '#e9e2f2', '--dsw-alias-markdown-code-block': '#f1ecf7', '--dsw-alias-markdown-code-block-banner': '#f1ecf7', '--dsw-alias-markdown-inline-code': '#ede6f4', '--dsw-alias-tooltip-bg': '#3b3347',
        },
        dark: {
          '--dsw-alias-bg-base': '#17131f', '--dsw-alias-bg-layer-1': '#1e1929', '--dsw-specific-input-major': '#1e1929', '--dsw-alias-bg-layer-2': '#272030', '--dsw-alias-bg-layer-3': '#30283a', '--dsw-alias-bg-module-platform': '#231d2e', '--dsw-specific-sidebar-fill': '#231d2e', '--dsw-alias-bg-overlay': '#38304a', '--dsw-alias-bg-multi-select': '#1e1929',
          '--dsw-alias-label-primary': '#f3eff9', '--dsw-alias-label-secondary': '#cfc6dc', '--dsw-alias-label-tertiary': '#a397b8', '--dsw-alias-label-caption': '#8d80a3',
          '--dsw-alias-brand-primary': '#fbbf24', '--dsw-alias-brand-text': '#fbbf24', '--dsw-alias-button-primary-fill': '#fbbf24', '--dsw-alias-button-primary-hover': '#f59e0b', '--dsw-alias-button-primary-dimmed': '#4a3414', '--dsw-alias-button-contrast-fill': '#f3eff9', '--dsw-alias-state-business-primary': '#fbbf24', '--dsw-alias-state-business-tertiary': '#453a1e',
          '--dsw-alias-interactive-bg-hover': '#fbbf2426', '--dsw-alias-interactive-bg-active': '#fbbf2433', '--dsw-alias-interactive-bg-hover-solid': '#1e1929', '--dsw-alias-markdown-code-block': '#1e1929', '--dsw-alias-markdown-code-block-banner': '#1e1929', '--dsw-alias-markdown-inline-code': '#262137', '--dsw-alias-tooltip-bg': '#463d55',
        },
      },
      ocean: {
        label: '碧海', desc: '深海蓝底 + 珊瑚橙强调，冷暖撞色清爽醒目。', chips: ['#e4edf4', '#ea580c', '#152636'],
        light: {
          '--dsw-alias-bg-base': '#f2f7fb', '--dsw-alias-bg-layer-1': '#e8f0f7', '--dsw-specific-input-major': '#e8f0f7', '--dsw-alias-bg-layer-2': '#dce7f0', '--dsw-alias-bg-layer-3': '#d1dfeb', '--dsw-alias-bg-module-platform': '#e4edf4', '--dsw-specific-sidebar-fill': '#e4edf4', '--dsw-alias-bg-overlay': '#c2d5e3', '--dsw-alias-bg-multi-select': '#dce7f0',
          '--dsw-alias-label-primary': '#12202e', '--dsw-alias-label-secondary': '#45586b', '--dsw-alias-label-tertiary': '#6b8195', '--dsw-alias-label-caption': '#8ba0b3',
          '--dsw-alias-brand-primary': '#ea580c', '--dsw-alias-brand-text': '#ea580c', '--dsw-alias-button-primary-fill': '#ea580c', '--dsw-alias-button-primary-hover': '#c2410c', '--dsw-alias-button-primary-dimmed': '#ffe4d1', '--dsw-alias-button-contrast-fill': '#12202e', '--dsw-alias-state-business-primary': '#ea580c', '--dsw-alias-state-business-tertiary': '#ffe8d8',
          '--dsw-alias-interactive-bg-hover': '#ea580c14', '--dsw-alias-interactive-bg-active': '#ea580c1f', '--dsw-alias-interactive-bg-hover-solid': '#dce7f0', '--dsw-alias-markdown-code-block': '#e8f0f7', '--dsw-alias-markdown-code-block-banner': '#e8f0f7', '--dsw-alias-markdown-inline-code': '#e2ebf3', '--dsw-alias-tooltip-bg': '#2a3a4d',
        },
        dark: {
          '--dsw-alias-bg-base': '#0c1826', '--dsw-alias-bg-layer-1': '#12202e', '--dsw-specific-input-major': '#12202e', '--dsw-alias-bg-layer-2': '#1a2b3d', '--dsw-alias-bg-layer-3': '#22364b', '--dsw-alias-bg-module-platform': '#152636', '--dsw-specific-sidebar-fill': '#152636', '--dsw-alias-bg-overlay': '#2b4158', '--dsw-alias-bg-multi-select': '#12202e',
          '--dsw-alias-label-primary': '#eef5fb', '--dsw-alias-label-secondary': '#b9cbd9', '--dsw-alias-label-tertiary': '#8ba2b7', '--dsw-alias-label-caption': '#748ba1',
          '--dsw-alias-brand-primary': '#fb923c', '--dsw-alias-brand-text': '#fb923c', '--dsw-alias-button-primary-fill': '#fb923c', '--dsw-alias-button-primary-hover': '#f97316', '--dsw-alias-button-primary-dimmed': '#4a2913', '--dsw-alias-button-contrast-fill': '#eef5fb', '--dsw-alias-state-business-primary': '#fb923c', '--dsw-alias-state-business-tertiary': '#3d2a17',
          '--dsw-alias-interactive-bg-hover': '#fb923c26', '--dsw-alias-interactive-bg-active': '#fb923c33', '--dsw-alias-interactive-bg-hover-solid': '#12202e', '--dsw-alias-markdown-code-block': '#12202e', '--dsw-alias-markdown-code-block-banner': '#12202e', '--dsw-alias-markdown-inline-code': '#1a2b3d', '--dsw-alias-tooltip-bg': '#3a4656',
        },
      },
      peach: {
        label: '蜜桃', desc: '暖粉米底 + 莓红强调，温柔活泼的甜系配色。', chips: ['#f8e8e4', '#be123c', '#2c1d1a'],
        light: {
          '--dsw-alias-bg-base': '#fdf6f4', '--dsw-alias-bg-layer-1': '#faece9', '--dsw-specific-input-major': '#faece9', '--dsw-alias-bg-layer-2': '#f5e0dc', '--dsw-alias-bg-layer-3': '#efd3ce', '--dsw-alias-bg-module-platform': '#f8e8e4', '--dsw-specific-sidebar-fill': '#f8e8e4', '--dsw-alias-bg-overlay': '#e8cbc4', '--dsw-alias-bg-multi-select': '#f5e0dc',
          '--dsw-alias-label-primary': '#33231f', '--dsw-alias-label-secondary': '#7a5d55', '--dsw-alias-label-tertiary': '#95786f', '--dsw-alias-label-caption': '#ad948c',
          '--dsw-alias-brand-primary': '#be123c', '--dsw-alias-brand-text': '#be123c', '--dsw-alias-button-primary-fill': '#be123c', '--dsw-alias-button-primary-hover': '#9f1239', '--dsw-alias-button-primary-dimmed': '#fde2e8', '--dsw-alias-button-contrast-fill': '#33231f', '--dsw-alias-state-business-primary': '#be123c', '--dsw-alias-state-business-tertiary': '#fce8ec',
          '--dsw-alias-interactive-bg-hover': '#be123c14', '--dsw-alias-interactive-bg-active': '#be123c1f', '--dsw-alias-interactive-bg-hover-solid': '#f5e0dc', '--dsw-alias-markdown-code-block': '#faece9', '--dsw-alias-markdown-code-block-banner': '#faece9', '--dsw-alias-markdown-inline-code': '#f7e6e3', '--dsw-alias-tooltip-bg': '#46302c',
        },
        dark: {
          '--dsw-alias-bg-base': '#1d1210', '--dsw-alias-bg-layer-1': '#281a17', '--dsw-specific-input-major': '#281a17', '--dsw-alias-bg-layer-2': '#332220', '--dsw-alias-bg-layer-3': '#3e2a27', '--dsw-alias-bg-module-platform': '#2c1d1a', '--dsw-specific-sidebar-fill': '#2c1d1a', '--dsw-alias-bg-overlay': '#4a332f', '--dsw-alias-bg-multi-select': '#281a17',
          '--dsw-alias-label-primary': '#fdf2f0', '--dsw-alias-label-secondary': '#d9bcb6', '--dsw-alias-label-tertiary': '#ab8d86', '--dsw-alias-label-caption': '#937a74',
          '--dsw-alias-brand-primary': '#fb7185', '--dsw-alias-brand-text': '#fb7185', '--dsw-alias-button-primary-fill': '#fb7185', '--dsw-alias-button-primary-hover': '#f43f5e', '--dsw-alias-button-primary-dimmed': '#4a2128', '--dsw-alias-button-contrast-fill': '#fdf2f0', '--dsw-alias-state-business-primary': '#fb7185', '--dsw-alias-state-business-tertiary': '#46242c',
          '--dsw-alias-interactive-bg-hover': '#fb718526', '--dsw-alias-interactive-bg-active': '#fb718533', '--dsw-alias-interactive-bg-hover-solid': '#281a17', '--dsw-alias-markdown-code-block': '#281a17', '--dsw-alias-markdown-code-block-banner': '#281a17', '--dsw-alias-markdown-inline-code': '#331f1c', '--dsw-alias-tooltip-bg': '#4d3631',
        },
      },
      moon: {
        label: '海月', desc: '沁蓝紫底 + 淡紫罗兰强调，月色冷调浪漫。', chips: ['#eedfd8', '#47499C', '#201f40'],
        light: {
          '--dsw-alias-bg-base': '#f6e3dc', '--dsw-alias-bg-layer-1': '#f1e0da', '--dsw-specific-input-major': '#f1e0da', '--dsw-alias-bg-layer-2': '#ead4cd', '--dsw-alias-bg-layer-3': '#e3c9c1', '--dsw-alias-bg-module-platform': '#eedfd8', '--dsw-specific-sidebar-fill': '#eedfd8', '--dsw-alias-bg-overlay': '#d7bab1', '--dsw-alias-bg-multi-select': '#ead4cd',
          '--dsw-alias-label-primary': '#2b2429', '--dsw-alias-label-secondary': '#78605c', '--dsw-alias-label-tertiary': '#96807c', '--dsw-alias-label-caption': '#ae9994',
          '--dsw-alias-brand-primary': '#47499C', '--dsw-alias-brand-text': '#47499C', '--dsw-alias-button-primary-fill': '#47499C', '--dsw-alias-button-primary-hover': '#2E2D69', '--dsw-alias-button-primary-dimmed': '#e8e6f6', '--dsw-alias-button-contrast-fill': '#2b2429', '--dsw-alias-state-business-primary': '#47499C', '--dsw-alias-state-business-tertiary': '#e9e7f6',
          '--dsw-alias-interactive-bg-hover': '#47499c14', '--dsw-alias-interactive-bg-active': '#47499c1f', '--dsw-alias-interactive-bg-hover-solid': '#ead4cd', '--dsw-alias-markdown-code-block': '#f1e0da', '--dsw-alias-markdown-code-block-banner': '#f1e0da', '--dsw-alias-markdown-inline-code': '#f3e2dc', '--dsw-alias-tooltip-bg': '#32315c',
        },
        dark: {
          '--dsw-alias-bg-base': '#15142e', '--dsw-alias-bg-layer-1': '#1c1b39', '--dsw-specific-input-major': '#1c1b39', '--dsw-alias-bg-layer-2': '#26254c', '--dsw-alias-bg-layer-3': '#2E2D69', '--dsw-alias-bg-module-platform': '#201f40', '--dsw-specific-sidebar-fill': '#201f40', '--dsw-alias-bg-overlay': '#3a3968', '--dsw-alias-bg-multi-select': '#1c1b39',
          '--dsw-alias-label-primary': '#f4f3fa', '--dsw-alias-label-secondary': '#c8c6de', '--dsw-alias-label-tertiary': '#9b99c0', '--dsw-alias-label-caption': '#8583ab',
          '--dsw-alias-brand-primary': '#8D8CC5', '--dsw-alias-brand-text': '#8D8CC5', '--dsw-alias-button-primary-fill': '#8D8CC5', '--dsw-alias-button-primary-hover': '#a5a4d4', '--dsw-alias-button-primary-dimmed': '#2e2c5c', '--dsw-alias-button-contrast-fill': '#f4f3fa', '--dsw-alias-state-business-primary': '#8D8CC5', '--dsw-alias-state-business-tertiary': '#2b2a56',
          '--dsw-alias-interactive-bg-hover': '#8d8cc526', '--dsw-alias-interactive-bg-active': '#8d8cc533', '--dsw-alias-interactive-bg-hover-solid': '#1c1b39', '--dsw-alias-markdown-code-block': '#1c1b39', '--dsw-alias-markdown-code-block-banner': '#1c1b39', '--dsw-alias-markdown-inline-code': '#242349', '--dsw-alias-tooltip-bg': '#47499C',
        },
      },
      pure: {
        label: '净华', desc: '雾灰底 + 苔绿强调，橄榄与暖沙的明净调。', chips: ['#e2dede', '#658874', '#1c1f16'],
        light: {
          '--dsw-alias-bg-base': '#ebe7e8', '--dsw-alias-bg-layer-1': '#e4e1e1', '--dsw-specific-input-major': '#e4e1e1', '--dsw-alias-bg-layer-2': '#dcd8d8', '--dsw-alias-bg-layer-3': '#d3cfce', '--dsw-alias-bg-module-platform': '#e2dede', '--dsw-specific-sidebar-fill': '#e2dede', '--dsw-alias-bg-overlay': '#d6bea6', '--dsw-alias-bg-multi-select': '#dcd8d8',
          '--dsw-alias-label-primary': '#292b23', '--dsw-alias-label-secondary': '#64695c', '--dsw-alias-label-tertiary': '#878c7e', '--dsw-alias-label-caption': '#a3a799',
          '--dsw-alias-brand-primary': '#658874', '--dsw-alias-brand-text': '#658874', '--dsw-alias-button-primary-fill': '#658874', '--dsw-alias-button-primary-hover': '#2D2F21', '--dsw-alias-button-primary-dimmed': '#e9eddd', '--dsw-alias-button-contrast-fill': '#292b23', '--dsw-alias-state-business-primary': '#658874', '--dsw-alias-state-business-tertiary': '#e6ead7',
          '--dsw-alias-interactive-bg-hover': '#65887414', '--dsw-alias-interactive-bg-active': '#6588741f', '--dsw-alias-interactive-bg-hover-solid': '#dcd8d8', '--dsw-alias-markdown-code-block': '#e4e1e1', '--dsw-alias-markdown-code-block-banner': '#e4e1e1', '--dsw-alias-markdown-inline-code': '#e6e1de', '--dsw-alias-tooltip-bg': '#33362a',
        },
        dark: {
          '--dsw-alias-bg-base': '#12140e', '--dsw-alias-bg-layer-1': '#191b14', '--dsw-specific-input-major': '#191b14', '--dsw-alias-bg-layer-2': '#20231a', '--dsw-alias-bg-layer-3': '#2D2F21', '--dsw-alias-bg-module-platform': '#1c1f16', '--dsw-specific-sidebar-fill': '#1c1f16', '--dsw-alias-bg-overlay': '#343829', '--dsw-alias-bg-multi-select': '#191b14',
          '--dsw-alias-label-primary': '#f2f1ec', '--dsw-alias-label-secondary': '#c6c8b9', '--dsw-alias-label-tertiary': '#9a9d8b', '--dsw-alias-label-caption': '#838676',
          '--dsw-alias-brand-primary': '#B9C88D', '--dsw-alias-brand-text': '#B9C88D', '--dsw-alias-button-primary-fill': '#B9C88D', '--dsw-alias-button-primary-hover': '#c6d4a0', '--dsw-alias-button-primary-dimmed': '#2f3a26', '--dsw-alias-button-contrast-fill': '#f2f1ec', '--dsw-alias-state-business-primary': '#B9C88D', '--dsw-alias-state-business-tertiary': '#2c3324',
          '--dsw-alias-interactive-bg-hover': '#B9c88d26', '--dsw-alias-interactive-bg-active': '#B9c88d33', '--dsw-alias-interactive-bg-hover-solid': '#191b14', '--dsw-alias-markdown-code-block': '#191b14', '--dsw-alias-markdown-code-block-banner': '#191b14', '--dsw-alias-markdown-inline-code': '#1f2318', '--dsw-alias-tooltip-bg': '#4a5340',
        },
      },
    };

    const PRESET_IDS = ['default', 'warm', 'ink', 'sage', 'violet', 'ocean', 'peach', 'moon', 'pure'];
    const PRESET_META = {
      default: { label: '官方默认', desc: '不应用任何配色覆盖，还原 DeepSeek 官方主题。' },
      warm: PRESETS.warm, ink: PRESETS.ink, sage: PRESETS.sage, violet: PRESETS.violet, ocean: PRESETS.ocean, peach: PRESETS.peach, moon: PRESETS.moon, pure: PRESETS.pure,
    };

    // —— 编译器镜像（与 theme.js 保持行为一致）——

    function buildThemeCss(theme) {
      const blocks = [];
      const preset = theme && PRESETS[theme.preset];
      if (preset) {
        const presetToCss = (tokens) => {
          const decls = Object.entries(tokens).map(([k, v]) => `${k}: ${v} !important;`);
          // 派生别名（与 theme.js 同步）：未入预设面的表面/按钮 token 指到
          // 预设已覆盖的同义 token（var() 引用同一 body 值，亮暗自动跟随）。
          decls.push('--dsw-alias-button-elevated-fill: var(--dsw-alias-bg-layer-1) !important;');
          decls.push('--dsw-specific-selector: var(--dsw-alias-bg-module-platform) !important;');
          decls.push('--dsw-alias-button-info-fill: var(--dsw-alias-brand-primary) !important;');
          decls.push('--dsw-alias-button-info-hover: var(--dsw-alias-button-primary-hover) !important;');
          decls.push('--dsw-specific-tip: var(--dsw-alias-bg-module-platform) !important;');
          decls.push('--dsw-specific-bubble: var(--dsw-alias-state-business-tertiary) !important;');
          // 新会话按钮 hover → 品牌强调淡档（与底色拉开，体现强调）；设置页签
          // hover/选中 → layer-3 / overlay（选中比 hover 深一档，与 theme.js 同步）。
          decls.push('--dsw-alias-button-floating-hover: var(--dsw-alias-button-primary-dimmed) !important;');
          decls.push('--dsw-specific-sidebar-nav-item-hover: var(--dsw-alias-bg-layer-3) !important;');
          decls.push('--dsw-specific-sidebar-nav-item-active: var(--dsw-alias-bg-overlay) !important;');
          decls.push('--dsw-specific-sidebar-nav-item-active-accent: var(--dsw-alias-interactive-bg-hover) !important;');
          // 弱化描边/禁用文字档（与 theme.js 同步）：插件卡展开/hover 描边用
          // label-dimmed，指到 border-l2 使展开态与折叠态描边同观感。
          decls.push('--dsw-alias-label-dimmed: var(--dsw-alias-border-l2) !important;');
          return decls.join(' ');
        };
        if (Object.keys(preset.light).length) blocks.push(`body { ${presetToCss(preset.light)} }`);
        if (Object.keys(preset.dark).length) blocks.push(`body[data-ds-dark-theme] { ${presetToCss(preset.dark)} }`);
        // 与 theme.js 同步：外观主题色块 hover 单独指到品牌浅档（8% 透明太弱）。
        blocks.push(`[class*="_themeCube"]:hover:not([class*="_selected"]) { background: var(--dsw-alias-button-primary-dimmed) !important; }`);
      }
      return blocks.join('\n');
    }

    /** 把快照 theme 编译后写入页面级 <style> 标签（不存在则创建）。 */
    function patchLiveTheme(snapshot) {
      if (typeof document === 'undefined') return;
      const css = buildThemeCss(snapshot.value && snapshot.value.theme);
      let tag = document.querySelector(STYLE_TAG);
      if (!tag) {
        tag = document.createElement('style');
        tag.setAttribute('data-ui-optimization', 'theme');
        document.head.appendChild(tag);
      }
      if (tag.textContent !== css) tag.textContent = css;
    }

    // —— 页签 UI ——

    const styles = {
      card: { display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 0' },
      title: { margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' },
      intro: { margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
      section: { marginTop: 8, padding: '12px 0', borderTop: '1px solid var(--dsw-alias-border-l2)' },
      sectionTitle: { margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' },
      presetGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 8 },
      preset: { display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', textAlign: 'left', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', font: 'inherit' },
      presetActive: { border: '1px solid var(--dsw-alias-state-business-primary)', boxShadow: '0 0 0 1px var(--dsw-alias-state-business-primary)' },
      presetLabel: { fontSize: 13, fontWeight: 600 },
      presetDesc: { fontSize: 11, lineHeight: 1.5, color: 'var(--dsw-alias-label-tertiary)' },
      chips: { display: 'flex', gap: 4 },
      chip: { width: 14, height: 14, borderRadius: 4, border: '1px solid rgba(0,0,0,.12)' },
      reset: { alignSelf: 'flex-start', marginTop: 8, padding: '4px 12px', fontSize: 12, color: 'var(--dsw-alias-label-secondary)', background: 'none', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8, cursor: 'pointer' },
      switchTrack: { flex: 'none', width: 34, height: 20, borderRadius: 999, padding: 2, boxSizing: 'border-box', background: 'var(--dsw-alias-border-l2)', display: 'flex', alignItems: 'center' },
      switchTrackOn: { background: 'var(--dsw-alias-state-business-primary)' },
      switchDot: { width: 16, height: 16, borderRadius: 999, background: 'var(--dsw-static-neutral-bluish-00)', transition: 'transform .16s', display: 'block' },
      widthRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '16px 0' },
      widthText: { display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 48 },
      widthTitle: { fontSize: 14, fontWeight: 400, color: 'var(--dsw-alias-label-primary)' },
      widthDesc: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      widthCtl: { display: 'flex', alignItems: 'center', gap: 8, flex: 'none' },
      num: { width: 30, boxSizing: 'border-box', padding: '4px 2px', fontSize: 13, textAlign: 'center', color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8 },
    };

    /** 官方把对话内容宽度定义为 .wSkVaW_root（CSS module hash 每构建会变）
      * 上的 --dsh-chat-content-width（默认 748px）。运行时从样式表解析出定义
      * 该变量的规则选择器并定位元素，内联覆盖宽度值 —— 消息列/输入框/底部
      * 提示共用同一变量，一并随动，且不依赖 hash。 */
    function findChatWidthEl() {
      const sheets = (typeof document !== 'undefined' && document.styleSheets) || [];
      for (let i = 0; i < sheets.length; i++) {
        let rules = null;
        try { rules = sheets[i].cssRules; } catch (e) { continue; }
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const r = rules[j];
          if (r.selectorText && r.style && r.style.getPropertyValue('--dsh-chat-content-width')) {
            try { const el = document.querySelector(r.selectorText); if (el) return el; } catch (e) {}
          }
        }
      }
      return null;
    }
    let widthAppliedEl = null;
    function applyChatWidth(adaptive, percent) {
      if (typeof document === 'undefined') return;
      const el = findChatWidthEl();
      if (!el) return;
      if (adaptive) {
        const pct = Math.min(100, Math.max(50, percent || 80));
        const px = Math.round((el.getBoundingClientRect().width || 0) * pct / 100);
        if (px) {
          el.style.setProperty('--dsh-chat-content-width', px + 'px');
          widthAppliedEl = el;
        }
      } else {
        el.style.removeProperty('--dsh-chat-content-width');
        if (widthAppliedEl && widthAppliedEl !== el) widthAppliedEl.style.removeProperty('--dsh-chat-content-width');
        widthAppliedEl = null;
      }
    }

    /** 简洁对话：隐藏消息流中 AI 侧附属块。
      * 注意：只隐藏 _callRow 会留下 0 高占位 + flex gap 空行，必须隐藏整条
      * _flowItem（消息列 flex 的直接子项）。「上下文注入」等非 callRow 块无法
      * 用 CSS 选择，由 markMinimal 按文本/结构打标（data-uiopt-minimal）驱动。 */
    let minimalStyle = null;
    function markMinimal(on) {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('[class$="_flowItem"]').forEach(function (item) {
        const hit = item.querySelector('[class$="_callRow"]') != null
          || /(上下文注入|Context injection|context injection)/i.test(item.textContent || '');
        item.setAttribute('data-uiopt-minimal', on && hit ? '1' : '0');
      });
    }
    function applyMinimalChat(on) {
      if (typeof document === 'undefined') return;
      if (!minimalStyle) {
        minimalStyle = document.createElement('style');
        minimalStyle.setAttribute('data-ui-optimization', 'minimal');
        (document.head || document.documentElement).appendChild(minimalStyle);
      }
      minimalStyle.textContent = on
        ? '[class$="_flowItem"][data-uiopt-minimal="1"]{display:none !important}[class$="_callRow"]{display:none !important}'
        : '';
      markMinimal(!!on);
    }

    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: NS });

      // 数字框步进按钮样式：隐藏原生 number spin、自绘 ▲▼（主题变量 + hover 反馈）
      if (typeof document !== 'undefined') {
        const nst = document.createElement('style');
        nst.textContent = '.uiopt-numbtn{flex:1;display:flex;align-items:center;justify-content:center;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:8px;line-height:1;cursor:pointer;border-radius:4px;}' +
          '.uiopt-numbtn:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);}' +
          '.uiopt-numbtn:active{background:var(--dsw-alias-bg-layer-2);}' +
          '.uiopt-numbtn:disabled{opacity:.35;cursor:not-allowed;}' +
          'input[type="number"].uiopt-num{appearance:textfield;-moz-appearance:textfield;}' +
          'input[type="number"].uiopt-num::-webkit-outer-spin-button,input[type="number"].uiopt-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}';
        (document.head || document.documentElement).appendChild(nst);
      }

      // 页面级初始化（不依赖打开设置面板）：Electron 首屏可能早于服务端
      // tapIndex 注入（主题 CSS / chatWidth 配置），必须由浏览器侧在页面加载
      // 时自愈；subscription 覆盖 settings 异步读盘/写入后的快照推送（等同
      // "自动点开一次配置页"）。ThemeSection 的 useEffect 保留作面板内即时
      // 刷新的落点，二者幂等。
      if (typeof document !== 'undefined') {
        const applyAllSettings = () => {
          const s = scope.getSnapshot();
          if (!s || !s.value) return;
          patchLiveTheme(s);
          applyMinimalChat(!!s.value.minimalChat);
          const cw = s.value.chatWidth || {};
          applyChatWidth(!!cw.adaptive, cw.percent || 80);
        };
        applyAllSettings();
        scope.subscribe(applyAllSettings);
        // 会话容器晚挂载 / SPA 切换时 chat root 会变化：观察 body，节流补应用。
        let lastWidth = 0;
        const widthObs = new MutationObserver(() => {
          const now = Date.now();
          if (now - lastWidth < 300) return;
          lastWidth = now;
          const snap = scope.getSnapshot();
          const value = snap.value || {};
          const cw = value.chatWidth || {};
          applyChatWidth(!!cw.adaptive, cw.percent || 80);
          markMinimal(!!value.minimalChat);
        });
        if (document.body) widthObs.observe(document.body, { subtree: true, childList: true });
        else document.addEventListener('DOMContentLoaded', () => widthObs.observe(document.body, { subtree: true, childList: true }), { once: true });
        // 窗口尺寸变化时按最新百分比重算像素宽度（百分比相对主内容区实时换算）
        let resizePending = false;
        window.addEventListener('resize', () => {
          if (resizePending) return;
          resizePending = true;
          setTimeout(() => {
            resizePending = false;
            const s = scope.getSnapshot();
            if (!s || !s.value) return;
            const cw = s.value.chatWidth || {};
            if (cw.adaptive) applyChatWidth(true, cw.percent || 80);
          }, 150);
        });
      }

      function ThemeSection() {
        // 注意绑定：scope 是类实例，getSnapshot/subscribe 以裸引用传给
        // useSyncExternalStore 会丢失 this（箭头包裹保绑定）。
        const snapshot = react.useSyncExternalStore(
          (listener) => scope.subscribe(listener),
          () => scope.getSnapshot(),
        );

        // 挂载即对齐一次，此后每次快照替换（本地写入回执 / 其他窗口修改）
        // 都重编 CSS —— 这是「改动即时生效」的落点。
        react.useEffect(() => {
          const onSnap = () => {
            const s = scope.getSnapshot();
            patchLiveTheme(s);
            const cw = (s.value && s.value.chatWidth) || {};
            applyChatWidth(!!cw.adaptive, cw.percent || 80);
          };
          onSnap();
          const unsub = scope.subscribe(onSnap);
          // 会话晚于设置脚本挂载 / 切换时 chat root 才出现：观察子树补应用
          let last = 0;
          const obs = new MutationObserver(() => {
            const now = Date.now();
            if (now - last < 300) return;
            last = now;
            const s = scope.getSnapshot();
            const cw = (s.value && s.value.chatWidth) || {};
            applyChatWidth(!!cw.adaptive, cw.percent || 80);
          });
          if (typeof document !== 'undefined' && document.body) {
            obs.observe(document.body, { subtree: true, childList: true });
          }
          return () => { unsub(); obs.disconnect(); };
        }, []);

        if (snapshot.status === 'loading') {
          return jsx('div', { style: styles.card, children: jsx('p', { style: styles.intro, children: '设置加载中……' }) });
        }
        if (snapshot.status === 'unavailable') {
          return jsx('div', { style: styles.card, children: jsx('p', { style: styles.intro, children: '此部署未开放设置持久化，页面不可用。' }) });
        }

        const theme = (snapshot.value && snapshot.value.theme) || {};
        const presetId = PRESET_IDS.includes(theme.preset) ? theme.preset : 'default';
        const disabled = !snapshot.writable;

        const writeTheme = (patch) => scope.set('theme', { ...theme, ...patch });
        const cw = (snapshot.value && snapshot.value.chatWidth) || {};
        const writeCw = (patch) => scope.set('chatWidth', { ...cw, ...patch });
        const minimal = !!((snapshot.value || {}).minimalChat);
        const writeMinimal = (v) => scope.set('minimalChat', v);
        // 数字框草稿：受控输入若无 onChange 会被 React 强制回弹，只能编辑中缓存草稿、blur 时提交
        const [draft, setDraft] = react.useState(null);

        const presetCard = (id) => {
          const meta = PRESET_META[id];
          const active = id === presetId;
          return jsx('button', {
            style: { ...styles.preset, ...(active ? styles.presetActive : null) },
            disabled,
            onClick: () => writeTheme({ preset: id }),
            'aria-pressed': active,
            children: [
              jsx('span', { style: styles.presetLabel, children: meta.label }),
              id !== 'default' && jsx('span', {
                style: styles.chips,
                children: meta.chips.map((c) => jsx('span', { key: c, style: { ...styles.chip, background: c } })),
              }),
              jsx('span', { style: styles.presetDesc, children: meta.desc }),
            ],
          });
        };

        return jsx('div', {
          style: styles.card,
          children: [
            jsx('h3', { style: styles.title, children: '界面定制' }),
            jsx('p', { style: styles.intro, children: '配色以整风格预设提供（保证内部颜色一致），不支持逐色自定义。改动即时生效并持久化。' }),
            jsx('div', {
              style: styles.section,
              children: [
                jsx('div', { style: styles.sectionTitle, children: '配色方案' }),
                jsx('div', {
                  style: styles.presetGrid,
                  children: PRESET_IDS.map((id) => presetCard(id)),
                }),
              ],
            }),
            jsx('div', {
              style: { ...styles.widthRow, borderBottom: '1px solid rgba(0,0,0,0.1)' },
              children: [
                jsx('div', {
                  style: styles.widthText,
                  children: [
                    jsx('div', { style: styles.widthTitle, children: '对话区域宽度自适应' }),
                    jsx('div', { style: styles.widthDesc, children: '开启后对话区域随窗口宽度伸缩，占主内容区宽度的 50%~100%。' }),
                  ],
                }),
                jsx('div', {
                  style: styles.widthCtl,
                  children: [
                    cw.adaptive && jsx('div', {
                      style: { flex: 'none', display: 'flex', alignItems: 'center', gap: 2 },
                      children: [
                        jsx('input', {
                          type: 'number', min: 50, max: 100,
                          className: 'uiopt-num',
                          value: draft === null ? (cw.percent || 80) : draft,
                          disabled: disabled || !cw.adaptive,
                          'aria-label': '对话宽度百分比',
                          style: styles.num,
                          onChange: (e) => setDraft(e.currentTarget.value),
                          onBlur: () => {
                            if (draft === null) return; // 未编辑：放弃（Number(null) 会被当作 0 误提交）
                            let v = Number(draft);
                            if (!Number.isFinite(v)) v = 80;
                            v = Math.min(100, Math.max(50, Math.round(v)));
                            setDraft(null);
                            writeCw({ percent: v });
                          },
                          onKeyDown: (e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          },
                        }),
                        jsx('div', {
                          style: { display: 'flex', flexDirection: 'column', gap: 2, flex: 'none' },
                          children: [
                            jsx('button', {
                              type: 'button', tabIndex: -1, className: 'uiopt-numbtn',
                              disabled: disabled || !cw.adaptive,
                              'aria-label': '增加对话宽度',
                              style: { pointerEvents: 'auto', fontSize: 9, color: 'var(--dsw-alias-label-secondary)' },
                              onClick: () => { const v = Math.min(100, (cw.percent || 80) + 1); writeCw({ percent: v }); },
                              children: '▲',
                            }),
                            jsx('button', {
                              type: 'button', tabIndex: -1, className: 'uiopt-numbtn',
                              disabled: disabled || !cw.adaptive,
                              'aria-label': '减少对话宽度',
                              style: { pointerEvents: 'auto', fontSize: 9, color: 'var(--dsw-alias-label-secondary)' },
                              onClick: () => { const v = Math.max(50, (cw.percent || 80) - 1); writeCw({ percent: v }); },
                              children: '▼',
                            }),
                          ],
                        }),
                      ],
                    }),
                    jsx('button', {
                      type: 'button', role: 'switch', 'aria-checked': !!cw.adaptive,
                      disabled, 'aria-label': '对话区域宽度自适应',
                      onClick: () => writeCw({ adaptive: !cw.adaptive }),
                      style: { flex: 'none', padding: 0, border: 'none', background: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', font: 'inherit' },
                      children: jsx('span', { style: { ...styles.switchTrack, ...(cw.adaptive ? styles.switchTrackOn : null) }, children: jsx('span', { style: { ...styles.switchDot, transform: cw.adaptive ? 'translateX(14px)' : 'translateX(0)' } }) }),
                    }),
                  ],
                }),
              ],
            }),
            jsx('div', {
              style: styles.widthRow,
              children: [
                jsx('div', {
                  style: styles.widthText,
                  children: [
                    jsx('div', { style: styles.widthTitle, children: '简洁对话' }),
                    jsx('div', { style: styles.widthDesc, children: '隐藏对话中 AI 侧的工具调用等附属信息，仅保留回复正文与思考。' }),
                  ],
                }),
                jsx('div', {
                  style: styles.widthCtl,
                  children: [
                    jsx('button', {
                      type: 'button', role: 'switch', 'aria-checked': minimal,
                      disabled, 'aria-label': '简洁对话',
                      onClick: () => writeMinimal(!minimal),
                      style: { flex: 'none', padding: 0, border: 'none', background: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', font: 'inherit' },
                      children: jsx('span', { style: { ...styles.switchTrack, ...(minimal ? styles.switchTrackOn : null) }, children: jsx('span', { style: { ...styles.switchDot, transform: minimal ? 'translateX(14px)' : 'translateX(0)' } }) }),
                    }),
                  ],
                }),
              ],
            }),
            jsx('button', {
              style: styles.reset, disabled,
              onClick: () => scope.unset('theme'),
              children: '恢复默认（清除用户覆盖）',
            }),
          ],
        });
      }

      // settings.section 是 list slot：id 唯一、order 决定导航顺序
      // （models=10 / plugins=15 / agent-presets=20 → 本页签 21 紧跟其后）。
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'ui-optimization',
        order: 21,
        label: 'UI Optimization',
        inject: () => ({}),
      }, ThemeSection));
    }

    exports.apply = apply;
    exports.inject = ['slots', 'settingsScope'];
    return module.exports;
  },
});