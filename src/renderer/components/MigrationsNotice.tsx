import React, { useEffect, useState } from "react";

type MigrationInfo = { id: string; filename: string };

export function MigrationsNotice() {
  const [pending, setPending] = useState<MigrationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      setLoading(true);
      try {
        // @ts-ignore window.dbMigrations from preload
        const status = await window.dbMigrations.getStatus();
        setPending(status.pending || []);
      } catch (err: any) {
        setMessage(String(err));
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  if (loading) return <div>Checando atualizações do banco...</div>;
  if (pending.length === 0) return null;

  const applyAll = async () => {
    setApplying(true);
    setMessage(null);
    try {
      // @ts-ignore
      const res = await window.dbMigrations.applyAll();
      setMessage(`Migrations aplicadas: ${res.applied.join(", ")}`);
      setPending([]);
    } catch (err: any) {
      setMessage("Erro ao aplicar: " + String(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ padding: 12, background: "#fff3cd", border: "1px solid #ffeeba" }}>
      <strong>Atualização do banco requerida</strong>
      <div>{pending.length} migration(s) pendente(s).</div>
      <ul>
        {pending.map((p) => (
          <li key={p.id}>{p.filename}</li>
        ))}
      </ul>
      <div style={{ marginTop: 8 }}>
        <button onClick={applyAll} disabled={applying}>
          {applying ? "Aplicando..." : "Aplicar atualizações do banco"}
        </button>
      </div>
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </div>
  );
}