const fs = require('fs')
const path = require('path')

const dir = path.join(process.cwd(), 'node_modules', 'fsevents')
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    // create a minimal package.json so tools don't error on scan
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fsevents', version: '0.0.0' }))
    console.log('Created placeholder:', dir)
  } else {
    console.log('Placeholder already exists:', dir)
  }
} catch (err) {
  console.error('Failed to create fsevents placeholder:', err)
  process.exit(1)
}
