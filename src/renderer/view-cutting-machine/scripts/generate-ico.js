#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

// Try to import png-to-ico with ESM/CJS fallback
let pngToIco
try {
  const mod = await import('png-to-ico')
  pngToIco = mod.default || mod
} catch (e) {
  try {
    // fallback to require (in case of older package structure)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // Note: dynamic require in ESM - use createRequire if needed
    // but Node can still handle simple require when module is CommonJS
    // Use eval to avoid static analysis in ESM contexts
    // eslint-disable-next-line no-eval
    const req = eval('require')
    pngToIco = req('png-to-ico')
  } catch (err) {
    console.error('Could not load png-to-ico module:', err)
    process.exit(2)
  }
}

const input = path.join(process.cwd(), 'build', 'view-cutting-machine-256x256.png')
const output = path.join(process.cwd(), 'build', 'view-cutting-machine.ico')

async function main() {
  try {
    console.log('Input:', input)
    console.log('Output:', output)
    if (!fs.existsSync(input)) {
      console.error('Input PNG not found:', input)
      process.exit(2)
    }

    const buf = await pngToIco(input)
    if (!buf || !(buf instanceof Buffer)) {
      console.error('png-to-ico did not return a Buffer:', typeof buf)
      process.exit(3)
    }
    fs.writeFileSync(output, buf)
    console.log('Created ICO:', output)
  } catch (err) {
    console.error('Failed to create ICO:', err && err.stack ? err.stack : err)
    process.exit(1)
  }
}

main()
