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
  build: {
    rolldownOptions: {
      output: {
        // three.js core in its own chunk, so its hash (and browser cache)
        // only changes when the dependency does, not with every app release.
        // Limited to three/build so lazily-loaded add-ons (GLTFLoader etc.)
        // stay in their own chunks.
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]build[\\/]/ }],
        },
      },
    },
    // The three chunk alone exceeds the default 500 KiB warning.
    chunkSizeWarningLimit: 600,
  },
  define: {
    __APP_VERSION__: JSON.stringify(git('git describe --tags --abbrev=0', 'unknown')),
    __GIT_COMMIT__: JSON.stringify(git('git rev-parse --short HEAD', 'unknown')),
  },
})
