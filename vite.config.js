import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

function git(command, fallback) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return fallback
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/atlas-stellaire/',
  plugins: [svelte()],
  define: {
    __APP_VERSION__: JSON.stringify(git('git describe --tags --abbrev=0', 'unknown')),
    __GIT_COMMIT__: JSON.stringify(git('git rev-parse --short HEAD', 'unknown')),
  },
})
