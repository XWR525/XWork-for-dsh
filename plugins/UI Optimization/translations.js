// F1 界面翻译字典（EN → ZH）。
//
// 来源：对 @deepseek-ai/dsh-client-ui-*@0.1.1-rc.2 全部 33 个包 lib/client.js
// 产物的扫描（zh/en 字典逐键比对 + 硬编码字符串提取）。残余英文分两类：
//
//   A. 字典缺译——zh 字典键存在但值未翻译（保留英文原文），DOM 渲染即英文；
//   B. 硬编码拷贝——组件内直渲染的英文字符串，绕过 locale 系统（U0 的 (c') 类）。
//
// 保留不译（有意为之）：TTFT、tok/s、LLM 等技术单位；"my-agent"、"acme-gateway"
// 等示例值；"DSH Local Build" 构建水印。
//
// 维护：上游升级后重跑扫描，对比本文件；运行时自检见 index.js 注入脚本的
// window.__uiOptimizationReport()。

// ---- A. 字典缺译（zh 值未翻译，按包归类）----
const DICT_MISSING = {
  // ui-cordis
  'Cordis Plugin': 'Cordis 插件',
  'Host': '宿主',
  'Client': '客户端',
  // ui-model-selection
  'Default': '默认',
  // ui-reference
  'Session': '会话',
  // ui-trajectory（toolbar.*）
  'Duration': '时长',
  'Use actual duration': '使用实际时长',
  'Use equal-width operations': '使用等宽操作',
  'Turns': '轮次',
  'Expand turns': '展开轮次',
  'Collapse turns': '折叠轮次',
  'Calls': '调用',
  'Expand calls': '展开调用',
  'Collapse calls': '折叠调用',
}

// ---- B. 硬编码拷贝（按包归类）----
// 真机验收（U1）注：settings-plugins 全部、settings-models 与 agent-preset /
// conversation 的部分字符串上游实为「双语常量按 locale 取值」（zh 变体已存在），
// 对应条目已删除；本节仅保留真机验证过的有效条目。
const HARDCODED = {
  // ui-agent-preset
  'Agent preset': '智能体预设',
  // ui-conversation
  'Think': '思考',
  'Thinking': '思考',
  // ui-plan
  'failed to exit plan mode': '退出计划模式失败',
  // ui-settings-models
  'Uses the provider default': '使用提供商默认值',
  'Add an API key to get started': '添加 API key 即可开始',
  'Internal Testing Notice': '内部测试提示',
  // ui-conversation PermissionSelect（权限模式下拉：触发器显示值 + 展开选项）
  'Read Only': '只读',
  'Workspace Write': '可读写工作区',
  'Full access': '完全访问',
  // ui-skill
  'Skill': '技能',
  // ui-tool
  'OUT': '输出',
  // ui-trajectory（详情面板 children 标签）
  'Assistant Message': '助手消息',
  'User': '用户',
  'Skill-catalog': '技能目录',
  'Subagent-settled': '子代理完成',
  'Subagent-report': '子代理报告',
  'Cache created': '新建缓存',
  'Cached': '缓存命中',
  'Compaction': '压缩',
  'Content': '内容',
  'Error': '错误',
  'Generation': '生成',
  'Input': '输入',
  'Model': '模型',
  'No system prompt in this request': '此请求没有系统提示词',
  'No timing data': '无计时数据',
  'No tools in this request': '此请求没有工具',
  'Not available': '不可用',
  'Options not recorded': '未记录选项',
  'Other': '其他',
  'Output': '输出',
  'Parameters': '参数',
  'Provider': '提供商',
  'Purpose': '用途',
  'Reasoning': '推理',
  'Result': '结果',
  'Retry delay': '重试延迟',
  'Retry': '重试',
  'Schema unavailable': 'Schema 不可用',
  'Session cumulative': '会话累计',
  'Source not recorded': '未记录来源',
  'Source': '来源',
  'Preview': '预览',
  'Raw': '原始',
  'Summary': '摘要',
  'Payload': '有效载荷',
  'Schema': '模式',
  'Timing': '计时',
  'Hierarchy': '层级结构',
  'Usage': '用量',
  'Request Timing': '请求计时',
  'Completed': '已完成',
  'Failed': '失败',
  'Started': '开始时间',
  'TTFT': '首 Token 时间',
  'Status': '状态',
  'Subtool calls': '子工具调用',
  'SYSTEM': '系统',
  'This request': '本次请求',
  'Throughput': '吞吐',
  'Timing source': '计时来源',
  'Tokens': 'Token 数',
  'Tool Call': '工具调用',
  'Tool calls': '工具调用',
  'Tools': '工具',
  'Total duration': '总时长',
  'Usage not reported': '未报告用量',
  // ui-trajectory（title 属性）
  'Drag to resize. Double-click to reset.': '拖动调整大小；双击重置。',
  'Message': '消息',
  'Open image': '打开图片',
  'Open tool call summary': '打开工具调用摘要',
  'System Prompt': '系统提示词',
  // 真机验收（U1）补遗：轨迹页横幅与时间线
  'Session log': '导出会话日志',
  'Initial System Prompt': '初始系统提示词',
  'Trajectory timeline': '轨迹时间线',
  'Timeline overview; drag horizontally to focus events': '时间线概览；水平拖动以聚焦事件',
  // 真机补遗：轨迹时间轴角色标签（kindTag，与 SYSTEM 同族）与历史加载按钮/气泡
  'ASSISTANT': 'AI助手',
  'USER': '用户',
  'TOOL': '工具',
  'CONTEXT': '上下文',
  'Load earlier history': '加载更早历史',
  'Click to load earlier history': '点击加载更早历史',
  'Show Unix timestamp': '显示为 Unix 时间戳',
  'Show local time': '显示为本地时间',
  'Session timestamps': '会话时间戳',
  'Loading earlier history…': '正在加载历史记录...',
  '(tool call only)': '工具调用',
  'Deep diving...': 'AI正在分析...',
}

// ---- C. 插值模板（{placeholder} → 正则匹配）----
// 键为 EN 模板，值为 ZH 模板；占位符按名对应，匹配时捕获任意非空内容。
const TEMPLATE_MAP = {
  // ui-cordis panel.runningCount（字典缺译，含占位符，单独走模板）
  '{count} running': '{count} 个运行中',
  // ui-trajectory 详情页位置行（真机实测分隔符 U+00B7：`Turn 3 · Step 170`）
  'Turn {turn} · Step {step}': '第 {turn} 轮 · 第 {step} 步',
  // ui-trajectory 悬浮气泡统计行（· 前后空白由模板容忍；TTFT 译法与词条一致）
  'Total {total} ms·TTFT {ttft} ms·Decoding {dec} ms': '总计 {total} ms · 首 Token {ttft} ms · 解码 {dec} ms',
    'Total {total} ms': '总计 {total} ms',
  'Request {request_id}': '请求 {request_id}',
  'Turn {turn}': '第 {turn} 轮',
  'Plugin · {plugin_name}': '插件 {plugin_name}',
}

// ---- v0 行为保留：首页主标题改写（ZHS→ZH，非翻译）----
const HEADLINE_REWRITE = {
  '探索未至之境': '第普希克',
}

export const TEXT_MAP = { ...HEADLINE_REWRITE, ...DICT_MISSING, ...HARDCODED }
export { TEMPLATE_MAP }
