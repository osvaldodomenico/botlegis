import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BuscaService {
  constructor(private prisma: PrismaService) {}

  // Busca full-text para bot: nome, coordenação, liderança
  async buscar(q: string, limit = 10) {
    if (!q || q.trim().length < 2) return { municipios: [], total: 0 };

    const term = q.trim();

    const municipios = await this.prisma.municipio.findMany({
      where: {
        OR: [
          { nome: { contains: term } },
          { coordenacao: { contains: term } },
          { lideranca: { contains: term } },
          { coord_lideranca_2: { contains: term } },
          { regiao: { contains: term } },
          { bloco: { contains: term } },
          { mesorregiao: { contains: term } },
          { microrregiao: { contains: term } },
        ],
      },
      take: Number(limit),
      orderBy: { projecao_votos: 'desc' },
      select: {
        id: true, nome: true, uf: true, regiao: true, bloco: true,
        rm_ra: true, mesorregiao: true, microrregiao: true,
        projecao_votos: true, coordenacao: true, lideranca: true,
        funcao_cargo: true, eleitores_22: true, observacoes: true,
      },
    });

    return {
      query: term,
      total: municipios.length,
      municipios: municipios.map(m => ({ ...m, id: m.id.toString() })),
    };
  }

  // Stats por região
  async statsPorRegiao(regiao: string) {
    const where = { regiao: { contains: regiao } };

    const [municipios, agg] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        select: {
          id: true, nome: true, projecao_votos: true,
          coordenacao: true, lideranca: true, eleitores_22: true,
        },
        orderBy: { projecao_votos: 'desc' },
      }),
      this.prisma.municipio.aggregate({
        where,
        _sum: { projecao_votos: true, eleitores_22: true },
        _count: { id: true },
        _avg: { projecao_votos: true },
        _max: { projecao_votos: true },
      }),
    ]);

    return {
      regiao,
      total_municipios: agg._count.id,
      total_projecao: agg._sum.projecao_votos || 0,
      total_eleitores: agg._sum.eleitores_22 || 0,
      media_projecao: Math.round(agg._avg.projecao_votos || 0),
      maior_projecao: agg._max.projecao_votos || 0,
      top5: municipios.slice(0, 5).map(m => ({ ...m, id: m.id.toString() })),
      municipios: municipios.map(m => ({ ...m, id: m.id.toString() })),
    };
  }

  // Stats por bloco
  async statsPorBloco(bloco: string) {
    const where = { bloco: { contains: bloco } };

    const [municipios, agg] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        select: {
          id: true, nome: true, regiao: true, projecao_votos: true,
          coordenacao: true, lideranca: true,
        },
        orderBy: { projecao_votos: 'desc' },
      }),
      this.prisma.municipio.aggregate({
        where,
        _sum: { projecao_votos: true },
        _count: { id: true },
      }),
    ]);

    return {
      bloco,
      total_municipios: agg._count.id,
      total_projecao: agg._sum.projecao_votos || 0,
      municipios: municipios.map(m => ({ ...m, id: m.id.toString() })),
    };
  }

  // Busca por coordenador/liderança
  async municipiosPorCoordenador(nome: string) {
    const municipios = await this.prisma.municipio.findMany({
      where: {
        OR: [
          { coordenacao: { contains: nome } },
          { lideranca: { contains: nome } },
          { coord_lideranca_2: { contains: nome } },
        ],
      },
      select: {
        id: true, nome: true, regiao: true, bloco: true,
        projecao_votos: true, coordenacao: true, lideranca: true,
        funcao_cargo: true, funcao_cargo_2: true, coord_lideranca_2: true,
      },
      orderBy: { nome: 'asc' },
    });

    const totalProjecao = municipios.reduce((sum, m) => sum + (m.projecao_votos || 0), 0);

    return {
      coordenador: nome,
      total_municipios: municipios.length,
      total_projecao: totalProjecao,
      municipios: municipios.map(m => ({ ...m, id: m.id.toString() })),
    };
  }

  // Ranking geral com filtros
  async ranking(query: { regiao?: string; bloco?: string; limit?: number }) {
    const { regiao, bloco, limit = 20 } = query;
    const where: any = {};
    if (regiao) where.regiao = { contains: regiao };
    if (bloco) where.bloco = { contains: bloco };

    const municipios = await this.prisma.municipio.findMany({
      where,
      select: {
        id: true, nome: true, regiao: true, bloco: true,
        projecao_votos: true, eleitores_22: true,
        coordenacao: true, lideranca: true,
      },
      orderBy: { projecao_votos: 'desc' },
      take: Number(limit),
    });

    const agg = await this.prisma.municipio.aggregate({
      where,
      _sum: { projecao_votos: true },
      _count: { id: true },
    });

    return {
      filtros: { regiao, bloco },
      total_municipios: agg._count.id,
      total_projecao: agg._sum.projecao_votos || 0,
      ranking: municipios.map((m, i) => ({
        posicao: i + 1,
        ...m,
        id: m.id.toString(),
      })),
    };
  }

  // Município sem coordenador
  async semCoordenador() {
    const municipios = await this.prisma.municipio.findMany({
      where: {
        AND: [
          { OR: [{ coordenacao: null }, { coordenacao: '' }] },
        ],
      },
      select: { id: true, nome: true, regiao: true, bloco: true, projecao_votos: true },
      orderBy: { projecao_votos: 'desc' },
    });

    return {
      total: municipios.length,
      municipios: municipios.map(m => ({ ...m, id: m.id.toString() })),
    };
  }

  // Lista de valores únicos para filtros (dropdown helpers)
  async opcoesFiltros() {
    const todos = await this.prisma.municipio.findMany({
      select: { regiao: true, bloco: true, rm_ra: true, mesorregiao: true, microrregiao: true },
    });

    // Normaliza removendo acentos só para comparação; prefere a forma mais acentuada no output
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    const distinct = (vals: (string | null | undefined)[]) => {
      const map = new Map<string, string>();
      for (const v of vals) {
        if (!v?.trim()) continue;
        const t = v.trim();
        const key = norm(t);
        const prev = map.get(key);
        // Prefere a versão mais acentuada (NFD mais longa = mais diacríticos)
        if (!prev || t.normalize('NFD').length > prev.normalize('NFD').length) map.set(key, t);
      }
      return [...map.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };

    return {
      regioes: distinct(todos.map(m => m.regiao)),
      blocos: distinct(todos.map(m => m.bloco)),
      rm_ras: distinct(todos.map(m => m.rm_ra)),
      mesorregioes: distinct(todos.map(m => m.mesorregiao)),
      microrregioes: distinct(todos.map(m => m.microrregiao)),
    };
  }
}
