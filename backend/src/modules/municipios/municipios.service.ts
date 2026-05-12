import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMunicipioDto, UpdateMunicipioDto, ListMunicipiosDto } from './dto/municipio.dto';

@Injectable()
export class MunicipiosService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListMunicipiosDto) {
    const { nome, regiao, bloco, page = 1, limit = 20, orderBy = 'nome', order = 'asc' } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (nome) where.nome = { contains: nome };
    if (regiao) where.regiao = { contains: regiao };
    if (bloco) where.bloco = { contains: bloco };

    const allowedSort = ['nome', 'regiao', 'bloco', 'projecao_votos', 'created_at'];
    const sortField = allowedSort.includes(orderBy) ? orderBy : 'nome';

    const [data, total] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortField]: order },
      }),
      this.prisma.municipio.count({ where }),
    ]);

    return {
      data: data.map(this.serialize),
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    };
  }

  async findOne(id: number) {
    const m = await this.prisma.municipio.findUnique({ where: { id: BigInt(id) } });
    if (!m) throw new NotFoundException(`Município ${id} não encontrado`);
    return this.serialize(m);
  }

  async create(dto: CreateMunicipioDto) {
    const m = await this.prisma.municipio.create({ data: dto as any });
    return this.serialize(m);
  }

  async update(id: number, dto: UpdateMunicipioDto) {
    await this.findOne(id);
    const m = await this.prisma.municipio.update({
      where: { id: BigInt(id) },
      data: dto as any,
    });
    return this.serialize(m);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.municipio.delete({ where: { id: BigInt(id) } });
    return { message: 'Município removido com sucesso' };
  }

  serialize(m: any) {
    return {
      ...m,
      id: m.id.toString(),
    };
  }
}
