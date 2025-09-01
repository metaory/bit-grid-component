import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/bit-grid-component/examples/vite-vue/',
  build: {
    target: 'esnext',
  },
  plugins: [vue()],
})
