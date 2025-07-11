import fs from 'fs'

import { Config } from './src/internal/config'

if (!globalThis.defined) {
  Config.FILES_DIR = './test/files'
  if (!fs.existsSync(Config.FILES_DIR)) {
    fs.mkdirSync(Config.FILES_DIR, { recursive: true })
  }
  globalThis.defined = true
}

globalThis.resetBeforeEachTest = true
