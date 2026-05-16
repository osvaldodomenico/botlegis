import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTerritorioDto, UpdateTerritorioDto, ListTerritoriosDto } from './dto/territorio.dto';

@Injectable()
export class TerritoriosService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListTerritoriosDto) {
    const page = query.page || 1;
    const limit = Math.min(25, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.nome) where.nome = { contains: query.nome };

    const [data, total] = await Promise.all([
      this.prisma.territorio.findMany({ where, skip, take: limit, orderBy: { nome: 'asc' } }),
      this.prisma.territorio.count({ where }),
    ]);

    return { data: data.map(t => ({ ...t, id: t.id.toString() })), meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findByNome(nome: string) {
    const territorios = await this.prisma.territorio.findMany({
      where: { nome: { equals: nome } },
      orderBy: { created_at: 'desc' },
    });
    return territorios.map(t => ({ ...t, id: t.id.toString() }));
  }

  async create(dto: CreateTerritorioDto) {
    const t = await this.prisma.territorio.create({ data: dto });
    return { ...t, id: t.id.toString() };
  }

  async update(id: string, dto: UpdateTerritorioDto) {
    const t = await this.prisma.territorio.update({ where: { id: BigInt(id) }, data: dto });
    return { ...t, id: t.id.toString() };
  }

  async remove(id: string) {
    await this.prisma.territorio.delete({ where: { id: BigInt(id) } });
    return { ok: true };
  }
}
