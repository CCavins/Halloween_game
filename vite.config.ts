import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Halloween_game/',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
})
