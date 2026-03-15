// Classe para calcular percentuais de ocupação/interferências por categoria
// Espera receber registros no formato:
// "2025-09-01 13:02:42|2025-09-01 13:02:51|00:00:09|PAUSE|Falta de abastecimento."

export type RegistroCategoria = {
  inicio: string; // ex: "2025-09-01 13:02:42"
  fim: string;    // ex: "2025-09-01 13:02:51"
  duracao: number; // em segundos
  categoria: string; // ex: "PAUSE"
  motivo: string; // ex: "Falta de abastecimento."
};

export class CategoriaOcupacaoCalculator {
  registros: RegistroCategoria[];

  constructor(registros: string[]) {
    this.registros = registros.map((linha) => {
      const partes = linha.split("|");
      if (partes.length < 5) throw new Error("Formato inválido");
      const [inicio, fim, duracaoStr, categoria, motivo] = partes;
      // Converter duracao para segundos
      const duracao = CategoriaOcupacaoCalculator.parseDuracao(duracaoStr);
      return { inicio, fim, duracao, categoria, motivo };
    });
  }

  static parseDuracao(duracaoStr: string): number {
    // Formato esperado: "00:00:09" (hh:mm:ss)
    const [h, m, s] = duracaoStr.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  }

  getTotalTempo(): number {
    return this.registros.reduce((acc, r) => acc + r.duracao, 0);
  }

  getPercentuaisPorCategoria(): Record<string, number> {
    const total = this.getTotalTempo();
    const porCategoria: Record<string, number> = {};
    this.registros.forEach((r) => {
      porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + r.duracao;
    });
    // Calcula percentual
    Object.keys(porCategoria).forEach((cat) => {
      porCategoria[cat] = total > 0 ? (porCategoria[cat] / total) * 100 : 0;
    });
    return porCategoria;
  }

  getMotivosPorCategoria(): Record<string, string[]> {
    const motivos: Record<string, string[]> = {};
    this.registros.forEach((r) => {
      if (!motivos[r.categoria]) motivos[r.categoria] = [];
      motivos[r.categoria].push(r.motivo);
    });
    return motivos;
  }
}
