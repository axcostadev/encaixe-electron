const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Allow passing DB file as first arg, then component ids: node scripts/check_apelido.js C:\path\to\app.db 1 2
let args = process.argv.slice(2);
let dbPath;
if (args.length > 0 && args[0].endsWith('.db')) {
  dbPath = args.shift();
} else {
  // default to APPDATA encaixe DB
  dbPath = path.join(process.env.APPDATA || process.env.USERPROFILE || '', 'cutting-room', 'encaixe.db');
}
console.log('Checking DB at:', dbPath);
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err)=>{
  if(err){ console.error('Failed to open DB:', err); process.exit(1); }
});
const ids = args;
if (ids.length === 0) {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) { console.error('Failed to list tables:', err); process.exit(1); }
    console.log('Tables in DB:', rows.map(r => r.name));
    db.close();
  });
} else {
  const q = `SELECT id, nome, apelido FROM componentes WHERE id IN (${ids.join(',')})`;
  db.all(q, (err, rows)=>{
    if(err){ console.error('Query error:', err); process.exit(1); }
    console.log('Rows:', rows);
    db.close();
  });
}