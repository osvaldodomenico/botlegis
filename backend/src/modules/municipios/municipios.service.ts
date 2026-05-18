import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMunicipioDto, UpdateMunicipioDto, ListMunicipiosDto } from './dto/municipio.dto';

@Injectable()
export class MunicipiosService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListMunicipiosDto) {
    const {
      nome, tipo_cadastro, regiao, bloco, rm_ra, mesorregiao, microrregiao,
      coordenacao, projecao_min, projecao_max,
      page = 1, limit = 25, orderBy = 'nome', order = 'asc'
    } = query;

    const safeLimit = Math.min(25, Math.max(1, Number(limit) || 25));
    const skip = (Number(page) - 1) * safeLimit;

    const where: any = {};
    if (nome) where.nome = { contains: nome };
    if (tipo_cadastro) where.tipo_cadastro = String(tipo_cadastro).trim().toUpperCase();
    if (regiao) where.regiao = regiao;
    if (bloco) where.bloco = bloco;
    if (rm_ra) where.rm_ra = rm_ra;
    if (mesorregiao) where.mesorregiao = mesorregiao;
    if (microrregiao) where.microrregiao = microrregiao;
    if (coordenacao) {
      where.OR = [
        { coordenacao: { contains: coordenacao } },
        { lideranca: { contains: coordenacao } },
        { coord_lideranca_2: { contains: coordenacao } },
      ];
    }
    if (projecao_min !== undefined || projecao_max !== undefined) {
      where.projecao_votos = {};
      if (projecao_min !== undefined) where.projecao_votos.gte = Number(projecao_min);
      if (projecao_max !== undefined) where.projecao_votos.lte = Number(projecao_max);
    }

    const allowedSort = ['nome', 'regiao', 'bloco', 'projecao_votos', 'created_at', 'mesorregiao', 'microrregiao'];
    const sortField = allowedSort.includes(orderBy) ? orderBy : 'nome';

    const [data, total] = await Promise.all([
      this.prisma.municipio.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { [sortField]: order },
      }),
      this.prisma.municipio.count({ where }),
    ]);

    return {
      data: data.map(this.serialize),
      meta: {
        total,
        page: Number(page),
        limit: safeLimit,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: number) {
    const m = await this.prisma.municipio.findUnique({ where: { id: BigInt(id) } });
    if (!m) throw new NotFoundException(`Município ${id} não encontrado`);
    return this.serialize(m);
  }

  private prepareData(dto: any) {
    const STRING_FIELDS = [
      'nome', 'uf', 'tipo_cadastro', 'funcao', 'distrito', 'bloco', 'regiao',
      'rm_ra', 'mesorregiao', 'microrregiao', 'divisao_regional', 'coordenacao',
      'lideranca', 'funcao_cargo', 'coord_lideranca_2', 'funcao_cargo_2',
      'candidato_nome', 'candidato_cargo',
    ];
    const NUM_FIELDS = [
      'projecao_votos', 'projecao_2', 'projecao_apoio_iurd', 'projecao_base',
      'eleitores_22', 'votos_validos_22', 'votos_22', 'percentual_mv', 'percentual_perda',
    ];
    const result: any = { ...dto };
    for (const f of STRING_FIELDS) {
      if (result[f] && typeof result[f] === 'string') result[f] = result[f].trim().toUpperCase();
    }
    for (const f of NUM_FIELDS) {
      if (result[f] === '' || result[f] === null) result[f] = undefined;
    }
    return result;
  }

  async create(dto: CreateMunicipioDto) {
    const data = this.prepareData(dto);
    const m = await this.prisma.municipio.create({ data: data as any });
    return this.serialize(m);
  }

  async update(id: number, dto: UpdateMunicipioDto) {
    await this.findOne(id);
    try {
      const data = this.prepareData(dto);
      const m = await this.prisma.municipio.update({
        where: { id: BigInt(id) },
        data: data as any,
      });
      return this.serialize(m);
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException(`Município "${(dto.nome || '').toUpperCase()}" já está cadastrado`);
      throw e;
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.municipio.delete({ where: { id: BigInt(id) } });
    return { message: 'Município removido com sucesso' };
  }

  // Lookup exato por nome (para bot)
  async lookupByName(nome: string) {
    const normalized = nome.trim().toLowerCase();
    const results = await this.prisma.municipio.findMany({
      where: { nome: { contains: normalized } },
      take: 5,
      orderBy: { nome: 'asc' },
    });
    return results.map(this.serialize);
  }

  serialize(m: any) {
    return { ...m, id: m.id.toString() };
  }
}
