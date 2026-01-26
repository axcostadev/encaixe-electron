import { Database } from "better-sqlite3";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export type Migration = { id: string; filename: string; sql: string };

export function ensureMigrationsTable(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

export function loadMigrations(folderPath: string): Migration[] {
  const files = readdirSync(folderPath)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((filename) => {
    const id = filename.split("_")[0];
    const sql = readFileSync(join(folderPath, filename), "utf8");
    return { id, filename, sql };
  });
}

export function getAppliedMigrationIds(db: Database): Set<string> {
  const rows = db.prepare("SELECT id FROM schema_migrations").all();
  return new Set(rows.map((r: any) => r.id));
}

export function getPendingMigrations(db: Database, migrationsFolder: string): Migration[] {
  ensureMigrationsTable(db);
  const migrations = loadMigrations(migrationsFolder);
  const applied = getAppliedMigrationIds(db);
  return migrations.filter((m) => !applied.has(m.id));
}

export function applyMigration(db: Database, migration: Migration) {
  const applyTx = db.transaction((m: Migration) => {
    db.exec(m.sql);
    const stmt = db.prepare(
      "INSERT INTO schema_migrations (id, filename, applied_at) VALUES (?, ?, datetime('now'))"
    );
    stmt.run(m.id, m.filename);
  });
  applyTx(migration);
}