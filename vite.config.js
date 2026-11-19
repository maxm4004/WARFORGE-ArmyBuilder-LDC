import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Versione = major.minor di package.json + numero di commit (cresce a ogni commit) + hash del commit.
// Si legge all'avvio di Vite: dopo un nuovo commit va riavviato.
function versione() {
  const [major, minor] = JSON.parse(readFileSync('./package.json', 'utf8')).version.split('.')
  try {
    const git = (cmd) => execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    return `${major}.${minor}.${git('rev-list --count HEAD')} (${git('rev-parse --short HEAD')})`
  } catch {
    return `${major}.${minor} (senza git)`
  }
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  define: { __VERSIONE__: JSON.stringify(versione()) },
})
