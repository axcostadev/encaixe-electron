import { ipcMain } from "electron";
import { Database } from "better-sqlite3";
import { join } from "path";
import {
  getPendingMigrations,
  loadMigrations,
  applyMigration,
  ensureMigrationsTable,
} from "../database/migrationRunner";

export function registerMigrationIpc(db: Database, appRoot: string) {
  const migrationsPath = join(appRoot, "src", "main", "database", "migrations");

  ipcMain.handle("db:get-migration-status", () => {
    ensureMigrationsTable(db);
    const pending = getPendingMigrations(db, migrationsPath);
    return {
      pendingCount: pending.length,
      pending: pending.map((p) => ({ id: p.id, filename: p.filename })),
    };
  });

  ipcMain.handle("db:apply-migration", (_event, migrationId: string) => {
    ensureMigrationsTable(db);
    const migrations = loadMigrations(migrationsPath);
    const target = migrations.find((m) => m.id === migrationId);
    if (!target) throw new Error("Migration not found: " + migrationId);
    applyMigration(db, target);
    return { applied: migrationId };
  });

  ipcMain.handle("db:apply-all-migrations", () => {
    ensureMigrationsTable(db);
    const pending = getPendingMigrations(db, migrationsPath);
    pending.forEach((m) => applyMigration(db, m));
    return { applied: pending.map((p) => p.id) };
  });
}