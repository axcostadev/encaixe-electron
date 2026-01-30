const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usage: node scripts/count_economia.js C:\path\to\app.db
const args = process.argv.slice(2);
let dbPath = args[0];

if (!dbPath) {
  // Try project default (Aincrad) and AppData path
  console.log('No DB path provided. Will check two common locations:');
  console.log('  1) C:\\Aincrad\\CuttingRoom\\app.db');
  console.log('  2) %APPDATA%\\cutting-room\\app.db');
  const candidates = [
    path.join('C:', 'Aincrad', 'CuttingRoom', 'app.db'),
    path.join(process.env.APPDATA || process.env.USERPROFILE || '', 'cutting-room', 'app.db')
  ];

  (async () => {
    for (const p of candidates) {
      await count(p);
    }
  })();
} else {
  count(dbPath);
}

function count(p) {
  return new Promise((resolve) => {
    try {
      if (!require('fs').existsSync(p)) {
        console.log(`[missing] DB not found at: ${p}`);
        return resolve(false);
      }
    } catch (e) {
      console.log(`[error] checking file ${p}:`, e);
      return resolve(false);
    }

    const db = new sqlite3.Database(p, sqlite3.OPEN_READONLY, (err)=>{
      if (err) {
        console.log(`[error] Failed to open DB ${p}:`, err.message || err);
        return resolve(false);
      }
    });

    db.get("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='economia'", (err, row)=>{
      if (err || !row || row.cnt === 0) {
        console.log(`[no-table] 'economia' table not found in ${p}`);
        db.close();
        return resolve(false);
      }
      db.get("SELECT COUNT(*) as c FROM economia", (err2, r2)=>{
        if (err2) {
          console.log(`[error] counting economia rows in ${p}:`, err2.message || err2);
        } else {
          console.log(`[ok] ${p} -> economia rows: ${r2.c}`);
        }
        db.close();
        resolve(true);
      });
    });
  });
}
