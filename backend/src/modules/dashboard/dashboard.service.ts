import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // Single query: fetch ALL rows and deduplicate in JS
    const todos = await this.prisma.municipio.findMany({
      select: {
        id: true, nome: true, regiao: true, bloco: true, rm_ra: true,
        tipo_cadastro: true,
        projecao_votos: true, projecao_base: true, projecao_2: true, projecao_apoio_iurd: true,
        votos_22: true, eleitores_22: true,
      },
    });

    // Helper: sum all 4 projection fields for a row
    const projRow = (m: typeof todos[0]) =>
      (m.projecao_votos || 0) + (m.projecao_base || 0) + (m.projecao_2 || 0) + (m.projecao_apoio_iurd || 0);

    // ── Deduplicate by city name ──────────────────────────────────────────
    const porCidade = new Map<string, {
      nome: string; regiao: string | null; bloco: string | null; rm_ra: string | null;
      votos_22: number; eleitores_22: number; projecao_total: number;
      id: string;
      tipos: Array<{ tipo: string; projecao: number }>;
    }>();

    for (const m of todos) {
      const key = m.nome.toUpperCase();
      const proj = projRow(m);
      if (!porCidade.has(key)) {
        porCidade.set(key, {
          id: m.id.toString(), nome: m.nome, regiao: m.regiao, bloco: m.bloco, rm_ra: m.rm_ra,
          votos_22: m.votos_22 || 0, eleitores_22: m.eleitores_22 || 0,
          projecao_total: 0, tipos: [],
        });
      }
      const city = porCidade.get(key)!;
      city.projecao_total += proj;
      if (m.votos_22 && m.votos_22 > city.votos_22) city.votos_22 = m.votos_22;
      if (m.eleitores_22 && m.eleitores_22 > city.eleitores_22) city.eleitores_22 = m.eleitores_22;
      if (proj > 0) city.tipos.push({ tipo: m.tipo_cadastro || 'Sem Tipo', projecao: proj });
    }

    const cidades = [...porCidade.values()];

    // ── Total municípios (distinct) ───────────────────────────────────────
    const totalMunicipios = cidades.length;

    // ── Total projeção (all projection fields, all rows) ──────────────────
    const totalProjecao = todos.reduce((s, m) => s + projRow(m), 0);

    // ── Por tipo (raw rows — each tipo_cadastro is a separate entry) ──────
    const tipoMap = new Map<string, { projecao: number; registros: number }>();
    for (const m of todos) {
      const tipo = m.tipo_cadastro || 'Sem Tipo';
      const existing = tipoMap.get(tipo) || { projecao: 0, registros: 0 };
      existing.projecao += projRow(m);
      existing.registros++;
      tipoMap.set(tipo, existing);
    }

    // ── Por RM/RA (deduplicated cities) ───────────────────────────────────
    const rmRaMap = new Map<string, { projecao: number; municipios: number }>();
    for (const c of cidades) {
      const rmra = c.rm_ra || 'Sem RM/RA';
      const existing = rmRaMap.get(rmra) || { projecao: 0, municipios: 0 };
      existing.projecao += c.projecao_total;
      existing.municipios++;
      rmRaMap.set(rmra, existing);
    }

    // ── Top 10 (deduplicated, sorted by total projection) ─────────────────
    const top10 = cidades
      .filter(c => c.projecao_total > 0)
      .sort((a, b) => b.projecao_total - a.projecao_total)
      .slice(0, 10)
      .map(c => ({
        id: c.id, nome: c.nome, regiao: c.regiao, bloco: c.bloco,
        votos_22: c.votos_22,
        projecao_votos: c.projecao_total,
        total_votos: c.votos_22 + c.projecao_total,
        tipos: c.tipos,
      }));

    return {
      total_municipios: totalMunicipios,
      total_projecao: totalProjecao,
      por_tipo: [...tipoMap.entries()]
        .map(([tipo, v]) => ({ tipo, total_projecao: v.projecao, total_registros: v.registros }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      por_rm_ra: [...rmRaMap.entries()]
        .map(([rm_ra, v]) => ({ rm_ra, total_projecao: v.projecao, total_municipios: v.municipios }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      top10_projecao: top10,
    };
  }

  async getRanking(query: any) {
    const { page = 1, limit = 20, regiao } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (regiao) where.regiao = { contains: regiao };

    const [data, total] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        select: { id: true, nome: true, regiao: true, bloco: true, projecao_votos: true, eleitores_22: true },
        orderBy: { projecao_votos: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.municipio.count({ where }),
    ]);

    return {
      data: data.map((m, idx) => ({ ...m, id: m.id.toString(), posicao: skip + idx + 1 })),
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }
}
