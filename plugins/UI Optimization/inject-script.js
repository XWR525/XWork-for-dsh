// 注入浏览器的翻译脚本（F1）。以函数源码形式经 tapIndex 写进 index.html，
// 调用形如 `(clientScript)(textEntries, tplEntries)`；必须自包含——
// 函数体内不得引用任何外部标识符，也不得使用模板字符串（避免嵌套转义）。
//
// 机制：
//   - textEntries: [EN, ZH][] 精确匹配，作用于文本节点与 placeholder/title/aria-label 属性；
//   - tplEntries:  [EN模板, ZH模板][]，{name} 占位符编译为锚定正则（捕获任意非空内容）；
//   - 多行内容（悬浮气泡等）按 \n 拆行逐行匹配，只替换命中行；
//   - 恒等映射不回写（t === s 跳过），防止 MutationObserver 属性回调自触发死循环；
//   - 自检：每条目命中计数，window.__uiOptimizationReport() 输出命中表（0 命中
//     = 上游改文案或页面未访问）；启动 15s 后把未收录的英文属性值以 console.info
//     汇总一次（仅 UI 属性，不含消息流文本，去重、上限 200 条）。

export function clientScript(textEntries, tplEntries, uiConfig) {
  var TEXT = new Map(textEntries)
  var ATTRS = ['placeholder', 'title', 'aria-label']
  var LATIN = /^[A-Za-z][A-Za-z0-9 .,!?'"()/:_-]{0,79}$/
  var hits = new Map()
  var unknown = new Set()
  var TPL = tplEntries.map(function (e) { return compile(e[0], e[1]) })

  function compile(src, dst) {
    var names = []
    var reSrc = src.split(/\{(\w+)\}/).map(function (part, i) {
      if (i % 2) { names.push(part); return '(.+?)' }
      // 固定段转义后，中点做空白容忍（官方文案 · 前后空格可能微调）
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/·/g, '\\s*·\\s*')
    }).join('')
    var repl = dst
    names.forEach(function (n, i) { repl = repl.split('{' + n + '}').join('$' + (i + 1)) })
    return [new RegExp('^' + reSrc + '$'), repl, src]
  }

  function mark(key) { hits.set(key, (hits.get(key) || 0) + 1) }

  function translate(s) {
    if (TEXT.has(s)) { mark(s); return TEXT.get(s) }
    for (var i = 0; i < TPL.length; i++) {
      if (TPL[i][0].test(s)) { mark(TPL[i][2]); return s.replace(TPL[i][0], TPL[i][1]) }
    }
    return null
  }

  // 多行内容（如悬浮气泡整块文本）按行拆分逐行匹配，只替换命中的行
  function translateLines(s) {
    if (s.indexOf('\n') === -1) return translate(s)
    var parts = s.split('\n')
    var out = new Array(parts.length)
    var changed = false
    for (var i = 0; i < parts.length; i++) {
      var t = translate(parts[i])
      if (t === null) { out[i] = parts[i] } else { out[i] = t; if (t !== parts[i]) changed = true }
    }
    return changed ? out.join('\n') : null
  }

  function fixText(node) {
    var t = translateLines(node.data)
    if (t !== null && t !== node.data) node.data = t
  }

  function fixAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i])
      if (v == null || v === '') continue
      var t = translateLines(v)
      if (t !== null && t !== v) el.setAttribute(ATTRS[i], t)
      else if (t === null && LATIN.test(v) && unknown.size < 200) unknown.add(v)
    }
  }

  function process(root) {
    if (root.nodeType === 3) { fixText(root); return }
    if (root.nodeType !== 1) return
    fixAttrs(root)
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    while (w.nextNode()) fixText(w.currentNode)
    w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    while (w.nextNode()) fixAttrs(w.currentNode)
  }

  function report() {
    var rows = []
    TEXT.forEach(function (zh, en) { rows.push({ en: en, zh: zh, hits: hits.get(en) || 0 }) })
    TPL.forEach(function (t) { rows.push({ en: t[2] + ' (tpl)', zh: t[1], hits: hits.get(t[2]) || 0 }) })
    console.table(rows)
    if (unknown.size) {
      console.info('[ui-optimization] 未收录的英文属性值（候选 / 失配线索）:', Array.from(unknown))
    }
  }
  window.__uiOptimizationReport = report

  // ---- 直达底部：拦截右下角悬浮图标钮的瞬间跳底，改为 0.5s 平滑滚动
  // （先慢后快再慢 = easeInOutCubic；锁定期内用户滚轮会被下一帧覆盖，最终到底）。
  // 按钮未见实证（当前实例未出现），按组合特征识别：右下角 + 小尺寸图标钮 +
  // 无文字 + 紧邻消息滚动容器；并排除发送/选择器等已知控件。----
  function isJumpToBottom(btn) {
    var mark = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '') + ' ' + (btn.textContent || '')).trim()
    if (/发送|选择|上下文|模型|access|select|workspace|工作区|权限/i.test(mark)) return false
    if (/[\u4e00-\u9fa5a-zA-Z]/.test(btn.textContent || '')) return false
    var r = btn.getBoundingClientRect()
    if (!r.width || !r.height || r.width > 48 || r.height > 48) return false
    var vw = document.documentElement.clientWidth
    var vh = document.documentElement.clientHeight
    if (r.right < vw - 200) return false
    if (r.bottom < vh - 240) return false
    var sc = findScrollable(btn)
    if (!sc) return false
    var sr = sc.getBoundingClientRect()
    if (r.bottom > sr.bottom + 8) return false
    if (r.left < sr.left + sr.width * 0.55) return false
    return true
  }
  // 定位消息滚动容器：优先按钮滚动祖先；兜底选第一个真正可滚的 _scroll
  // （注意 .Md3f7G_scroll 可能 overflow:visible，需跳过不可滚的）。
  function findScrollable(el) {
    while (el && el !== document.documentElement) {
      var oy = getComputedStyle(el).overflowY
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return el
      el = el.parentElement
    }
    var list = document.querySelectorAll('[class$="_scroll"]')
    for (var i = 0; i < list.length; i++) {
      var oy2 = getComputedStyle(list[i]).overflowY
      if (oy2 === 'auto' || oy2 === 'scroll' || oy2 === 'overlay') return list[i]
    }
    return null
  }
  function smoothScrollToBottom(el, dur) {
    if (!el) return
    var start = el.scrollTop
    var delta = (el.scrollHeight - el.clientHeight) - start
    var t0 = performance.now()
    function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
    function step(now) {
      var p = Math.min(1, (now - t0) / dur)
      el.scrollTop = start + delta * easeInOutCubic(p)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function onDocClickCapture(e) {
    var btn = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null
    if (!btn || !isJumpToBottom(btn)) return
    e.stopPropagation()
    e.preventDefault()
    smoothScrollToBottom(findScrollable(btn), 500)
  }

  // ---- 对话宽度自适应：常驻应用。client.js 的设置卡片仅在打开设置面板时
  // 挂载，无法覆盖常规浏览；此处由服务端注入 uiConfig.chatWidth，在页面加载/
  // 会话挂载时把官方固定 748px 的 --dsh-chat-content-width 覆盖为百分比。
  // 定位方式与 client.js 一致：解析样式表里定义该变量的规则选择器。----
  var chatWidth = (uiConfig && uiConfig.chatWidth) || {}
  var widthDone = false
  var lastWidthTry = 0

  function findChatWidthEl() {
    for (var si = 0; si < document.styleSheets.length; si++) {
      var rules = null
      try { rules = document.styleSheets[si].cssRules } catch (e) { continue }
      if (!rules) continue
      for (var ri = 0; ri < rules.length; ri++) {
        var r = rules[ri]
        if (r.selectorText && r.style && r.style.getPropertyValue('--dsh-chat-content-width')) {
          try {
            var el = document.querySelector(r.selectorText)
            if (el) return el
          } catch (e) {}
        }
      }
    }
    return null
  }

  function applyChatWidthNow() {
    if (!chatWidth.adaptive || widthDone) return
    var el = findChatWidthEl()
    if (!el) return
    var pct = chatWidth.percent || 80
    if (pct < 50) pct = 50
    if (pct > 100) pct = 100
    var px = Math.round((el.getBoundingClientRect().width || 0) * pct / 100)
    if (!px) return
    el.style.setProperty('--dsh-chat-content-width', px + 'px')
    widthDone = true
  }

  function applyChatWidthThrottled() {
    if (!chatWidth.adaptive || widthDone) return
    var now = Date.now()
    if (now - lastWidthTry < 250) return
    lastWidthTry = now
    applyChatWidthNow()
  }

  // ---- F4：原生 title 气泡 → 自定义黑底气泡（样式对齐官方 _bubble_* 组件）----
  // 把 title 内容迁到 data-uiopt-title 并移除 title（屏蔽原生直角白底气泡），
  // 悬停时用自建黑底圆角气泡显示，视觉与官方自定义气泡一致且跟随主题。
  // 悬停延迟 500ms 与官方气泡组件行为对齐（真机实测官方 openDelay ≈516ms）。
  // 渐显动画与官方对齐：animation 0.15s cubic-bezier(0.4,0,0.2,1)，仅关键帧 from{opacity:0}。
  var BUBBLE_ANIM = '0.15s cubic-bezier(0.4, 0, 0.2, 1) uiopt-tooltip-in'
  var bubbleEl = null
  var lastX = 0
  var lastY = 0
  var openTimer = null

  function clearOpen() {
    if (openTimer) { clearTimeout(openTimer); openTimer = null }
  }

  function ensureBubble() {
    if (!bubbleEl) {
      bubbleEl = document.createElement('div')
      bubbleEl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;visibility:hidden;max-width:553px;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;'
      document.body.appendChild(bubbleEl)
    }
    return bubbleEl
  }

  function hideBubble() { if (bubbleEl) bubbleEl.style.visibility = 'hidden' }

  function placeBubble(x, y) {
    var b = ensureBubble()
    var pad = 12
    var w = b.offsetWidth
    var h = b.offsetHeight
    var vw = document.documentElement.clientWidth
    var vh = document.documentElement.clientHeight
    var bx = x + pad
    var by = y + pad
    if (bx + w > vw - 4) bx = x - pad - w
    if (by + h > vh - 4) by = y - pad - h
    b.style.left = Math.max(4, bx) + 'px'
    b.style.top = Math.max(4, by) + 'px'
  }

  function migrateTitle(node) {
    if (!node || node.nodeType !== 1) return
    var els = node.querySelectorAll ? Array.prototype.slice.call(node.querySelectorAll('[title], [data-uiopt-title]')) : []
    if (node.hasAttribute && node.hasAttribute('title')) els.unshift(node)
    for (var i = 0; i < els.length; i++) {
      var t = els[i].getAttribute('title')
      if (t && t.length) {
        var zh = translateLines(t)
        els[i].setAttribute('data-uiopt-title', zh || t)
        els[i].removeAttribute('title')
      }
    }
  }

  document.addEventListener('mouseover', function (e) {
    var el = e.target
    var node = el && el.closest ? el.closest('[data-uiopt-title]') : null
    clearOpen()
    if (!node) { hideBubble(); return }
    var text = node.getAttribute('data-uiopt-title')
    if (!text) { hideBubble(); return }
    lastX = e.clientX
    lastY = e.clientY
    openTimer = setTimeout(function () {
      openTimer = null
      var b = ensureBubble()
      b.textContent = text
      b.style.visibility = 'visible'
      // 每次显示都重放淡入动画（先清除→强制 reflow→再应用）
      b.style.animation = 'none'
      void b.offsetWidth
      b.style.animation = BUBBLE_ANIM
      placeBubble(lastX, lastY)
    }, 500)
  })
  document.addEventListener('mousemove', function (e) {
    lastX = e.clientX
    lastY = e.clientY
    if (bubbleEl && bubbleEl.style.visibility === 'visible') placeBubble(e.clientX, e.clientY)
  })
  document.addEventListener('mouseout', function (e) {
    clearOpen()
    var rel = e.relatedTarget
    if (rel && rel.closest && rel.closest('[data-uiopt-title]')) return
    hideBubble()
  })

  var observer = new MutationObserver(function (muts) {
    applyChatWidthThrottled()
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i]
      if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          process(m.addedNodes[j])
          migrateTitle(m.addedNodes[j])
        }
      } else if (m.type === 'characterData') {
        fixText(m.target)
      } else if (m.type === 'attributes') {
        fixAttrs(m.target)
        if (m.attributeName === 'title') migrateTitle(m.target)
      }
    }
  })

  function start() {
    // 自建气泡淡入关键帧（对齐官方 _tooltip-in：仅 from{opacity:0}）
    var kf = document.createElement('style')
    kf.textContent = '@keyframes uiopt-tooltip-in { from { opacity: 0 } }'
    ;(document.head || document.documentElement).appendChild(kf)
    // 下拉弹层展开动画：覆盖三类弹层——`_menu` 后缀（CSS module 菜单）、
    // `[class*="_scrollable_"][class*="_list_"]`（vanilla-extract Select 弹层
    // 根类组合，兼容 _portal/_sideTop 等定位变体）、`_portal`（门户包装）。均
    // 条件挂载（打开才入 DOM），动画每次打开自动重放。只用 opacity+margin-top，
    // 不动 transform（浮层定位可能用 transform，避免冲突）；reduced-motion 降级。
    var ddSel = '[class$="_menu"], [class*="_portal"], [class*="_list_"][class*="_scrollable_"]'
    var ddKf = document.createElement('style')
    ddKf.textContent = '@keyframes uiopt-dropdown-open { from { opacity: 0; margin-top: -8px; } }' +
      ddSel + ' { animation: 0.16s cubic-bezier(0.4, 0, 0.2, 1) uiopt-dropdown-open; }' +
      '@media (prefers-reduced-motion: reduce) { ' + ddSel + ' { animation: none; } }'
    ;(document.head || document.documentElement).appendChild(ddKf)
    document.addEventListener('click', onDocClickCapture, true)
    window.addEventListener('resize', function () {
      if (!chatWidth.adaptive) return
      var el = findChatWidthEl()
      if (!el) return
      var pct = chatWidth.percent || 80
      el.style.setProperty('--dsh-chat-content-width', Math.round(el.getBoundingClientRect().width * pct / 100) + 'px')
    }, { passive: true })
    applyChatWidthThrottled()
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ATTRS,
    })
    process(document.body)
    migrateTitle(document.body)
    setTimeout(function () {
      if (unknown.size) {
        console.info('[ui-optimization] 未收录的英文属性值（候选 / 失配线索）:', Array.from(unknown))
      }
    }, 15000)
  }

  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start, { once: true })
}
