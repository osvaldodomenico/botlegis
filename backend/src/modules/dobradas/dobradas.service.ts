import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDobradaDto, UpdateDobradaDto, ListDobradaDto } from './dto/dobrada.dto';

@Injectable()
export class DobradaService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListDobradaDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.cidade) where.cidade = { contains: query.cidade };
    if (query.nome) where.nome = { contains: query.nome };

    const [data, total] = await Promise.all([
      this.prisma.dobrada.findMany({ where, skip, take: limit, orderBy: { cidade: 'asc' } }),
      this.prisma.dobrada.count({ where }),
    ]);

    return {
      data: data.map(d => ({ ...d, id: d.id.toString() })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findByCidade(cidade: string) {
    const rows = await this.prisma.dobrada.findMany({
      where: { cidade: { contains: cidade } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(d => ({ ...d, id: d.id.toString() }));
  }

  async create(dto: CreateDobradaDto) {
    const d = await this.prisma.dobrada.create({ data: dto as any });
    return { ...d, id: d.id.toString() };
  }

  async update(id: string, dto: UpdateDobradaDto) {
    const d = await this.prisma.dobrada.update({ where: { id: BigInt(id) }, data: dto });
    return { ...d, id: d.id.toString() };
  }

  async remove(id: string) {
    await this.prisma.dobrada.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }
}
