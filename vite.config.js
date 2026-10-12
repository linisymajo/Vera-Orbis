import { defineConfig } from 'vite'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        platform: resolve(rootDir, 'platform.html'),
        teacher: resolve(rootDir, 'teacher.html'),
        login: resolve(rootDir, 'login.html'),
        register: resolve(rootDir, 'register.html'),
        onboarding: resolve(rootDir, 'onboarding.html')
      }
    }
  }
})