import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  server: {
    proxy: {
      '/api/sales-engine': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        whoWeAre: resolve(rootDir, 'who-we-are/index.html'),
        languages: resolve(rootDir, 'languages/index.html'),
        method: resolve(rootDir, 'method/index.html'),
        experiences: resolve(rootDir, 'experiences/index.html'),
        contact: resolve(rootDir, 'contact/index.html'),
        platform: resolve(rootDir, 'platform.html'),
        teacher: resolve(rootDir, 'teacher.html'),
        login: resolve(rootDir, 'login.html'),
        resetPassword: resolve(rootDir, 'reset-password.html'),
        register: resolve(rootDir, 'register.html'),
        onboarding: resolve(rootDir, 'onboarding.html'),
      }
    }
  }
})
