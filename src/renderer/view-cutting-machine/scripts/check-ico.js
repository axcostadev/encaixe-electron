import fs from 'fs'
import path from 'path'

const icoPath = path.join(process.cwd(), 'build', 'view-cutting-machine.ico')

function readUInt16LE(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8)
}

function readUInt32LE(buf, offset) {
  return (buf[offset]) | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)
}

if (!fs.existsSync(icoPath)) {
  console.error('ICO not found:', icoPath)
  process.exit(2)
}

const buf = fs.readFileSync(icoPath)
if (buf.length < 6) {
  console.error('ICO too small')
  process.exit(3)
}

const reserved = readUInt16LE(buf, 0)
const type = readUInt16LE(buf, 2)
const count = readUInt16LE(buf, 4)

console.log('ICO file:', icoPath)
console.log('Reserved:', reserved, 'Type:', type, 'Count:', count)

let offset = 6
for (let i = 0; i < count; i++) {
  const width = buf[offset] === 0 ? 256 : buf[offset]
  const height = buf[offset + 1] === 0 ? 256 : buf[offset + 1]
  const colorCount = buf[offset + 2]
  const planes = readUInt16LE(buf, offset + 4)
  const bitCount = readUInt16LE(buf, offset + 6)
  const bytesInRes = readUInt32LE(buf, offset + 8)
  const imageOffset = readUInt32LE(buf, offset + 12)

  console.log(`Image ${i + 1}: ${width}x${height}, planes=${planes}, bitCount=${bitCount}, bytes=${bytesInRes}, offset=${imageOffset}`)
  offset += 16
}
