import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          // 宿主入口（启动流程）
          index: 'src/main/index.ts',
          // 桌面子插件入口：由模块解析钩子把 `xwork-for-dsh` 映射到该文件，
          // 以独立产物文件存在（加载器在运行时动态 import 它）。
          'xwork-shell': 'src/main/xwork-shell.ts',
        },
      },
    },
  },
})
