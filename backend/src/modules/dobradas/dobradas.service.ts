import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDobradaDto, UpdateDobradaDto, ListDobradaDto } from './dto/dobrada.dto';

@Injectable()
export class DobradaService {
  constructor(private prisma: PrismaService) {}

  async list(query: ListDobradaDto) {
    const page = query.page || 1;
    const limit = Math.min(25, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const conditions: Prisma.Sql[] = [];
    if (query.cidade) conditions.push(Prisma.sql`cidade LIKE ${`%${query.cidade}%`}`);
    if (query.nome) conditions.push(Prisma.sql`nome LIKE ${`%${query.nome}%`}`);

    const whereSql = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

    const sortFieldMap: Record<string, Prisma.Sql> = {
      nome: Prisma.sql`nome`,
      cidade: Prisma.sql`cidade`,
      projecao_votos: Prisma.sql`projecao_votos`,
    };
    const sortField = sortFieldMap[query.orderBy || 'cidade'] || sortFieldMap.cidade;
    const sortDir = query.order === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    const [data, totalRows] = await Promise.all([
      this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          MIN(id) AS id,
          UPPER(TRIM(nome)) AS nome,
          UPPER(TRIM(cidade)) AS cidade,
          MAX(projecao_votos) AS projecao_votos,
          MIN(created_at) AS created_at,
          MAX(updated_at) AS updated_at
        FROM dobradas
        ${whereSql}
        GROUP BY UPPER(TRIM(nome)), UPPER(TRIM(cidade))
        ORDER BY ${sortField} ${sortDir}, cidade ASC, nome ASC
        LIMIT ${limit} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS total
        FROM (
          SELECT 1
          FROM dobradas
          ${whereSql}
          GROUP BY UPPER(TRIM(nome)), UPPER(TRIM(cidade))
        ) deduplicadas
      `),
    ]);

    const total = Number(totalRows[0]?.total || 0);

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

  async mapByCidades(cidadesCsv: string) {
    const cidades = (cidadesCsv || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (cidades.length === 0) return {};

    const rows = await this.prisma.dobrada.findMany({
      where: { cidade: { in: cidades } },
      orderBy: { created_at: 'desc' },
    });

    const map: Record<string, any> = {};
    for (const d of rows) {
      const cidade = (d.cidade || '').toUpperCase();
      if (!cidade) continue;
      if (!map[cidade]) map[cidade] = { ...d, id: d.id.toString() };
    }
    return map;
  }

  async create(dto: CreateDobradaDto) {
    const data = this.prepareData(dto);
    await this.ensureNotDuplicate(data.nome, data.cidade);
    const d = await this.prisma.dobrada.create({ data: data as any });
    return { ...d, id: d.id.toString() };
  }

  async update(id: string, dto: UpdateDobradaDto) {
    const current = await this.prisma.dobrada.findUnique({ where: { id: BigInt(id) } });
    const data = this.prepareData(dto);
    const nome = data.nome || current?.nome || '';
    const cidade = data.cidade || current?.cidade || '';
    await this.ensureNotDuplicate(nome, cidade, BigInt(id));
    const d = await this.prisma.dobrada.update({ where: { id: BigInt(id) }, data });
    return { ...d, id: d.id.toString() };
  }

  async remove(id: string) {
    const current = await this.prisma.dobrada.findUnique({ where: { id: BigInt(id) } });
    if (!current) return { ok: true };

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM dobradas
      WHERE UPPER(TRIM(nome)) = ${current.nome.trim().toUpperCase()}
        AND UPPER(TRIM(cidade)) = ${current.cidade.trim().toUpperCase()}
    `);
    return { ok: true };
  }

  private prepareData<T extends CreateDobradaDto | UpdateDobradaDto>(dto: T): T {
    const data: any = { ...dto };
    if (data.nome) data.nome = data.nome.trim().toUpperCase();
    if (data.cidade) data.cidade = data.cidade.trim().toUpperCase();
    if (data.projecao_votos === '' || data.projecao_votos === null) data.projecao_votos = 0;
    return data;
  }

  private async ensureNotDuplicate(nome: string, cidade: string, ignoreId?: bigint) {
    if (!nome || !cidade) return;

    const duplicate = await this.prisma.dobrada.findFirst({
      where: {
        nome,
        cidade,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    });

    if (duplicate) {
      throw new ConflictException(`Dobrada "${nome}" já cadastrada para ${cidade}.`);
    }
  }
}
