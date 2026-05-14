import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalMunicipios, projecaoAgg, porRegiao, top10, porTipo] = await Promise.all([
      this.prisma.municipio.count(),
      this.prisma.municipio.aggregate({ _sum: { projecao_votos: true } }),
      this.prisma.municipio.groupBy({
        by: ['regiao'],
        _sum: { projecao_votos: true },
        _count: { id: true },
        orderBy: { _sum: { projecao_votos: 'desc' } },
      }),
      this.prisma.municipio.findMany({
        select: { id: true, nome: true, regiao: true, bloco: true, projecao_votos: true },
        orderBy: { projecao_votos: 'desc' },
        take: 10,
      }),
      this.prisma.municipio.groupBy({
        by: ['tipo_cadastro'],
        _sum: { projecao_votos: true },
        _count: { id: true },
      }),
    ]);

    return {
      total_municipios: totalMunicipios,
      total_projecao: projecaoAgg._sum.projecao_votos || 0,
      por_tipo: porTipo.map(t => ({
        tipo: t.tipo_cadastro || 'Sem Tipo',
        total_projecao: t._sum.projecao_votos || 0,
        total_registros: t._count.id,
      })),
      por_regiao: porRegiao.map(r => ({
        regiao: r.regiao || 'Sem Região',
        total_projecao: r._sum.projecao_votos || 0,
        total_municipios: r._count.id,
      })),
      top10_projecao: top10.map(m => ({ ...m, id: m.id.toString() })),
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
