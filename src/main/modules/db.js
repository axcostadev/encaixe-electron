import path from 'path';
import os from 'os';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'encaixe.db');
let db;

export function initDB() {
  return new Promise((resolve, reject) => {
    const exists = fs.existsSync(DB_FILE);
    db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) return reject(err);
      db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS linhas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT,
          of_number TEXT,
          artigo TEXT,
          modelo TEXT,
          codigo_cor TEXT,
          grade TEXT,
          pares INTEGER,
          especificacao TEXT,
          prioridade TEXT
        )`, (err2) => {
          if (err2) return reject(err2);
              // create cadastros table as well
              db.run(`CREATE TABLE IF NOT EXISTS cadastros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                artigo TEXT,
                modelo TEXT,
                componente TEXT,
                material TEXT,
                cor TEXT,
                largura TEXT,
                tipo_tecido TEXT,
                pares_criac TEXT,
                conjug_navalha TEXT,
                placa_por_par TEXT,
                camada TEXT,
                espacamento TEXT,
                comprimento_max TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )`, (err3) => {
                if (err3) return reject(err3);
                resolve();
              });
        });
      });
    });
  });
}

    export function saveCadastro(cadastro) {
      return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO cadastros (artigo, modelo, componente, material, cor, largura, tipo_tecido, pares_criac, conjug_navalha, placa_por_par, camada, espacamento, comprimento_max) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        stmt.run(
          cadastro.artigo || null,
          cadastro.modelo || null,
          cadastro.componente || null,
          cadastro.material || null,
          cadastro.cor || null,
          cadastro.largura || null,
          cadastro.tipoTecido || null,
          cadastro.paresCriac || null,
          cadastro.conjugNavalha || null,
          cadastro.placaPorPar || null,
          cadastro.camada || null,
          cadastro.espacamento || null,
          cadastro.comprimentoMax || null,
          function (err) {
            if (err) return reject(err);
            resolve({ id: this.lastID });
          }
        );
        stmt.finalize();
      });
    }

    export function getCadastroByArtigo(artigo) {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM cadastros WHERE artigo = ? ORDER BY id DESC LIMIT 1', [artigo], (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
      });
    }

    export function findCadastro(artigo, componente) {
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM cadastros WHERE artigo = ? AND LOWER(componente) = LOWER(?) ORDER BY id DESC LIMIT 1', [artigo, componente], (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        });
      });
    }

    export function listCadastros(limit = 100) {
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM cadastros ORDER BY id DESC LIMIT ?', [limit], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    }

    export function deleteCadastroById(id) {
      return new Promise((resolve, reject) => {
        db.run('DELETE FROM cadastros WHERE id = ?', [id], function (err) {
          if (err) return reject(err);
          resolve({ deleted: this.changes || 0 });
        });
      });
    }

function runInsert(source, linha) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`INSERT INTO linhas (source, of_number, artigo, modelo, codigo_cor, grade, pares, especificacao, prioridade) VALUES (?,?,?,?,?,?,?,?,?)`);
    stmt.run(source, linha.of, linha.artigo || null, linha.modelo || null, linha.codigoCor || null, linha.grade || null, linha.pares || null, linha.especificacaoTecnica || null, linha.prioridade || null, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
    stmt.finalize();
  });
}

export async function saveCTFLines(results) {
  // results: array of { of, linhas: [...] }
  const inserted = [];
  for (const bloco of results) {
    for (const linha of bloco.linhas) {
      const id = await runInsert('ctf', linha);
      inserted.push(id);
    }
  }
  return inserted;
}

export async function saveCTCLines(results) {
  const inserted = [];
  for (const bloco of results) {
    for (const linha of bloco.linhas) {
      const id = await runInsert('ctc', linha);
      inserted.push(id);
    }
  }
  return inserted;
}

export function getAllLines() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM linhas ORDER BY id DESC', (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export function getLinesByOf(ofNumber) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM linhas WHERE of_number = ? ORDER BY id DESC', [ofNumber], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

export function clearLines() {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM linhas', function (err) {
      if (err) return reject(err);
      resolve({ deleted: this.changes || 0 });
    });
  });
}
