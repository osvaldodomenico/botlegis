import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const tiposCadastro = ['EXTERNO', 'BASE - INSTITUIÇÃO', 'BASE APOIADORES'];
    const normalizeTipo = (tipo?: string | null) => (tipo || '').trim().toUpperCase();
    const isTipoCadastro = (tipo?: string | null) => tiposCadastro.includes(normalizeTipo(tipo));

    // Single query: fetch ALL rows and deduplicate in JS
    const todos = await this.prisma.municipio.findMany({
      select: {
        id: true, nome: true, regiao: true, bloco: true, rm_ra: true, divisao_regional: true,
        tipo_cadastro: true,
        projecao_votos: true, projecao_base: true, projecao_2: true, projecao_apoio_iurd: true,
        votos_22: true, eleitores_22: true,
      },
    });

    // O dashboard deve seguir a mesma projeção principal usada nas outras telas.
    const projRow = (m: typeof todos[0]) => m.projecao_votos || 0;
    const cadastros = todos.filter(m => isTipoCadastro(m.tipo_cadastro));

    // ── Deduplicate by city name ──────────────────────────────────────────
    const porCidade = new Map<string, {
      nome: string; regiao: string | null; bloco: string | null; rm_ra: string | null; divisao_regional: string | null;
      votos_22: number; eleitores_22: number; projecao_total: number;
      id: string;
      tipos: Array<{ tipo: string; projecao: number }>;
    }>();

    for (const m of cadastros) {
      const key = m.nome.toUpperCase();
      const proj = projRow(m);
      if (!porCidade.has(key)) {
        porCidade.set(key, {
          id: m.id.toString(), nome: m.nome, regiao: m.regiao, bloco: m.bloco, rm_ra: m.rm_ra, divisao_regional: m.divisao_regional,
          votos_22: m.votos_22 || 0, eleitores_22: m.eleitores_22 || 0,
          projecao_total: 0, tipos: [],
        });
      }
      const city = porCidade.get(key)!;
      city.projecao_total += proj;
      if (!city.regiao && m.regiao) city.regiao = m.regiao;
      if (!city.bloco && m.bloco) city.bloco = m.bloco;
      if (!city.rm_ra && m.rm_ra) city.rm_ra = m.rm_ra;
      if (!city.divisao_regional && m.divisao_regional) city.divisao_regional = m.divisao_regional;
      if (m.votos_22 && m.votos_22 > city.votos_22) city.votos_22 = m.votos_22;
      if (m.eleitores_22 && m.eleitores_22 > city.eleitores_22) city.eleitores_22 = m.eleitores_22;
      if (proj > 0) city.tipos.push({ tipo: normalizeTipo(m.tipo_cadastro), projecao: proj });
    }

    const cidades = [...porCidade.values()];

    // ── Total municípios (distinct) ───────────────────────────────────────
    const totalMunicipios = cidades.length;

    // ── Total projeção (somente cadastros dos três tipos válidos) ─────────
    const totalProjecao = cadastros.reduce((s, m) => s + projRow(m), 0);

    // ── Por tipo (raw rows — each tipo_cadastro is a separate entry) ──────
    const tipoMap = new Map<string, { projecao: number; registros: number }>();
    for (const m of cadastros) {
      const tipo = normalizeTipo(m.tipo_cadastro);
      const existing = tipoMap.get(tipo) || { projecao: 0, registros: 0 };
      existing.projecao += projRow(m);
      existing.registros++;
      tipoMap.set(tipo, existing);
    }

    // ── Por Divisão Regional (all cadastros — cada registro conta na sua divisão) ──
    const divRegMap = new Map<string, { projecao: number; municipios: Set<string> }>();
    for (const m of cadastros) {
      const div = (m.divisao_regional || '').trim();
      if (!div) continue;
      if (!divRegMap.has(div)) divRegMap.set(div, { projecao: 0, municipios: new Set() });
      const entry = divRegMap.get(div)!;
      entry.projecao += projRow(m);
      entry.municipios.add(m.nome.toUpperCase());
    }

    const toTopItem = (c: {
      id: string; nome: string; regiao: string | null; bloco: string | null;
      votos_22: number; projecao_total: number; tipos: Array<{ tipo: string; projecao: number }>;
    }) => ({
      id: c.id, nome: c.nome, regiao: c.regiao, bloco: c.bloco,
      votos_22: c.votos_22,
      projecao_votos: c.projecao_total,
      total_votos: c.votos_22 + c.projecao_total,
      tipos: c.tipos,
    });

    // ── Top 10 (deduplicated, sorted by total projection) ─────────────────
    const top10 = cidades
      .filter(c => c.projecao_total > 0)
      .sort((a, b) => b.projecao_total - a.projecao_total)
      .slice(0, 10)
      .map(toTopItem);

    const top10PorTipo = tiposCadastro.reduce<Record<string, typeof top10>>((acc, tipo) => {
      const cidadesTipo = new Map<string, {
        id: string; nome: string; regiao: string | null; bloco: string | null;
        votos_22: number; projecao_total: number; tipos: Array<{ tipo: string; projecao: number }>;
      }>();

      for (const m of cadastros) {
        const tipoCadastro = normalizeTipo(m.tipo_cadastro);
        if (tipoCadastro !== tipo) continue;

        const proj = projRow(m);
        if (proj <= 0) continue;

        const key = m.nome.toUpperCase();
        if (!cidadesTipo.has(key)) {
          cidadesTipo.set(key, {
            id: m.id.toString(), nome: m.nome, regiao: m.regiao, bloco: m.bloco,
            votos_22: m.votos_22 || 0,
            projecao_total: 0,
            tipos: [],
          });
        }

        const city = cidadesTipo.get(key)!;
        city.projecao_total += proj;
        if (m.votos_22 && m.votos_22 > city.votos_22) city.votos_22 = m.votos_22;
        city.tipos.push({ tipo, projecao: proj });
      }

      acc[tipo] = [...cidadesTipo.values()]
        .sort((a, b) => b.projecao_total - a.projecao_total)
        .slice(0, 10)
        .map(toTopItem);

      return acc;
    }, {});

    return {
      total_municipios: totalMunicipios,
      total_projecao: totalProjecao,
      por_tipo: [...tipoMap.entries()]
        .map(([tipo, v]) => ({ tipo, total_projecao: v.projecao, total_registros: v.registros }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      por_divisao_regional: [...divRegMap.entries()]
        .map(([divisao_regional, v]) => ({ divisao_regional, total_projecao: v.projecao, total_municipios: v.municipios.size }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      top10_projecao: top10,
      top10_por_tipo: top10PorTipo,
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
