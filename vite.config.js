import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', 
  plugins: [react()],
  resolve: {
    alias: {
      // Maintains support for your "@/components" and "@/pages" absolute import shortcuts
      '@': path.resolve(__dirname, './src'),
    },
  },
})