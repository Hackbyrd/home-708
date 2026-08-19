import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const devPort = Number(process.env.VITE_DEV_PORT ?? 5173)

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
  },
  build: { sourcemap: true },
})
