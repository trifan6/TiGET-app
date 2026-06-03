import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    proxy: {
      // 1. Proxy the GraphQL API
      '/graphql': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // 2. Proxy the REST API (for offline sync)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // 3. Proxy the WebSockets
      '/tiget-ws': {
        target: 'ws://localhost:3000',
        ws: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tiget-ws/, '')
      }
    }
  }
})