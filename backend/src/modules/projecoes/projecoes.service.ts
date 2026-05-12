import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjecoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { regiao, bloco, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (regiao) where.regiao = { contains: regiao };
    if (bloco) where.bloco = { contains: bloco };

    const [data, total] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        skip,
        take: Number(limit),
        select: { id: true, nome: true, regiao: true, bloco: true, projecao_votos: true, updated_at: true },
        orderBy: { projecao_votos: 'desc' },
      }),
      this.prisma.municipio.count({ where }),
    ]);

    return {
      data: data.map(m => ({ ...m, id: m.id.toString() })),
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  async update(id: number, dto: { projecao_votos: number; observacoes?: string }, userEmail: string) {
    const municipio = await this.prisma.municipio.findUnique({ where: { id: BigInt(id) } });
    if (!municipio) throw new NotFoundException(`Município ${id} não encontrado`);

    const [updated] = await this.prisma.$transaction([
      this.prisma.municipio.update({
        where: { id: BigInt(id) },
        data: { projecao_votos: dto.projecao_votos, observacoes: dto.observacoes },
      }),
      this.prisma.auditoriaProjecao.create({
        data: {
          municipio_id: BigInt(id),
          valor_antigo: municipio.projecao_votos,
          valor_novo: dto.projecao_votos,
          alterado_por: userEmail,
        },
      }),
    ]);

    return { ...updated, id: updated.id.toString() };
  }

  async historico(id: number) {
    const audits = await this.prisma.auditoriaProjecao.findMany({
      where: { municipio_id: BigInt(id) },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return audits.map(a => ({ ...a, id: a.id.toString(), municipio_id: a.municipio_id.toString() }));
  }
}
