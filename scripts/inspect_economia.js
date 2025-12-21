#!/usr/bin/env node
const path = require('path')
try {
  const xlsx = require('xlsx')
  const file = path.join(__dirname, '..', 'ECONOMIA DASHBOARD.xlsx')
  console.log('Reading file:', file)
  const wb = xlsx.readFile(file, { cellDates: true })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
    const data = xlsx.utils.sheet_to_json(ws, { defval: null })
    console.log('Sheet name:', sheetName)
    console.log('Rows count:', data.length)
    // Save full data to JSON for inspection
    const fs = require('fs')
    const outFile = path.join(__dirname, 'economia_all.json')
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8')
    console.log('Full data written to:', outFile)
} catch (err) {
  console.error('Error reading Excel:', err && err.message ? err.message : err)
  process.exit(2)
}
