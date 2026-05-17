import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import mysql from 'mysql2/promise';

type BiConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordSet: boolean;
  table: string;
  colMunicipio: string;
  colCandidato: string;
  colVotos: string;
  colEleitores: string;
  colValidos: string;
  colCargo: string;
  colUf: string;
  colAno: string;
  candidatoNome: string;
  cargo: string;
  uf: string;
  ano: number;
};

@Injectable()
export class IntegracaoBIService {
  private namespace = 'bi';

  constructor(private config: IntegracoesService, private prisma: PrismaService) {}

  private toInt(v: any, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private idOrThrow(name: string, v: string) {
    const value = (v || '').trim();
    if (!/^[A-Za-z0-9_]+$/.test(value)) throw new BadRequestException(`Identificador inválido: ${name}`);
    return value;
  }

  async getConfig(): Promise<BiConfig> {
    const host = await this.config.getPlain(this.namespace, 'host');
    const port = this.toInt(await this.config.getPlain(this.namespace, 'port'), 3306);
    const database = await this.config.getPlain(this.namespace, 'database');
    const user = await this.config.getPlain(this.namespace, 'user');
    const passwordRow = await this.config.get(this.namespace, 'password');

    const table = await this.config.getPlain(this.namespace, 'table');
    const colMunicipio = await this.config.getPlain(this.namespace, 'colMunicipio');
    const colCandidato = await this.config.getPlain(this.namespace, 'colCandidato');
    const colVotos = await this.config.getPlain(this.namespace, 'colVotos');
    const colEleitores = await this.config.getPlain(this.namespace, 'colEleitores');
    const colValidos = await this.config.getPlain(this.namespace, 'colValidos');
    const colCargo = await this.config.getPlain(this.namespace, 'colCargo');
    const colUf = await this.config.getPlain(this.namespace, 'colUf');
    const colAno = await this.config.getPlain(this.namespace, 'colAno');

    const candidatoNome = (await this.config.getPlain(this.namespace, 'candidatoNome')) || 'MILTON VIEIRA';
    const cargo = (await this.config.getPlain(this.namespace, 'cargo')) || 'DEPUTADO FEDERAL';
    const uf = (await this.config.getPlain(this.namespace, 'uf')) || 'SP';
    const ano = this.toInt(await this.config.getPlain(this.namespace, 'ano'), 2022);

    return {
      host,
      port,
      database,
      user,
      passwordSet: !!passwordRow?.valor,
      table,
      colMunicipio,
      colCandidato,
      colVotos,
      colEleitores,
      colValidos,
      colCargo,
      colUf,
      colAno,
      candidatoNome,
      cargo,
      uf,
      ano,
    };
  }

  async saveConfig(input: Partial<BiConfig> & { password?: string }) {
    const set = async (k: string, v: any) => {
      if (v === undefined) return;
      await this.config.upsert(this.namespace, k, String(v ?? '').trim(), false);
    };

    await set('host', input.host);
    await set('port', input.port);
    await set('database', input.database);
    await set('user', input.user);

    await set('table', input.table);
    await set('colMunicipio', input.colMunicipio);
    await set('colCandidato', input.colCandidato);
    await set('colVotos', input.colVotos);
    await set('colEleitores', input.colEleitores);
    await set('colValidos', input.colValidos);
    await set('colCargo', input.colCargo);
    await set('colUf', input.colUf);
    await set('colAno', input.colAno);

    await set('candidatoNome', input.candidatoNome);
    await set('cargo', input.cargo);
    await set('uf', input.uf);
    await set('ano', input.ano);

    if (input.password !== undefined && input.password !== '') {
      await this.config.upsert(this.namespace, 'password', (input.password || '').trim(), true);
    }

    return this.getConfig();
  }

  private async getConnParams() {
    const cfg = await this.getConfig();
    const password = (await this.config.getPlain(this.namespace, 'password')).trim();
    if (!cfg.host) throw new BadRequestException('Host do BI não configurado');
    if (!cfg.database) throw new BadRequestException('Database do BI não configurado');
    if (!cfg.user) throw new BadRequestException('User do BI não configurado');
    if (!password) throw new BadRequestException('Password do BI não configurado');
    return { cfg, password };
  }

  async testarConexao() {
    const { cfg, password } = await this.getConnParams();
    const conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password,
      database: cfg.database,
    });
    try {
      const [rows] = await conn.query('SELECT VERSION() AS version');
      const version = Array.isArray(rows) && rows[0] ? (rows[0] as any).version : null;
      return { ok: true, version };
    } finally {
      await conn.end();
    }
  }

  async buscarMiltonPorMunicipio() {
    const { cfg, password } = await this.getConnParams();
    const table = this.idOrThrow('table', cfg.table);
    const colMunicipio = this.idOrThrow('colMunicipio', cfg.colMunicipio);
    const colCandidato = this.idOrThrow('colCandidato', cfg.colCandidato);
    const colVotos = this.idOrThrow('colVotos', cfg.colVotos);
    const colEleitores = this.idOrThrow('colEleitores', cfg.colEleitores);
    const colValidos = this.idOrThrow('colValidos', cfg.colValidos);
    const colCargo = this.idOrThrow('colCargo', cfg.colCargo);
    const colUf = this.idOrThrow('colUf', cfg.colUf);
    const colAno = this.idOrThrow('colAno', cfg.colAno);

    const conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password,
      database: cfg.database,
    });

    const sql = `
      WITH base AS (
        SELECT
          ${colMunicipio} AS municipio,
          ${colCandidato} AS candidato,
          ${colVotos} AS votos,
          ${colEleitores} AS eleitores_22,
          ${colValidos} AS validos_22,
          DENSE_RANK() OVER (PARTITION BY ${colMunicipio} ORDER BY ${colVotos} DESC) AS posicao
        FROM ${table}
        WHERE ${colAno} = ?
          AND ${colUf} = ?
          AND ${colCargo} = ?
      )
      SELECT
        municipio,
        MAX(eleitores_22) AS eleitores_22,
        MAX(validos_22) AS validos_22,
        MAX(CASE WHEN candidato = ? THEN votos ELSE NULL END) AS votos_22,
        MAX(CASE WHEN candidato = ? THEN posicao ELSE NULL END) AS posicao
      FROM base
      GROUP BY municipio
      ORDER BY municipio ASC
    `;

    try {
      const candidato = cfg.candidatoNome.toUpperCase();
      const [rows] = await conn.execute(sql, [cfg.ano, cfg.uf, cfg.cargo, candidato, candidato]);
      return (rows as any[]).map(r => ({
        municipio: String(r.municipio || '').trim().toUpperCase(),
        eleitores_22: Number(r.eleitores_22) || 0,
        validos_22: Number(r.validos_22) || 0,
        votos_22: Number(r.votos_22) || 0,
        posicao: r.posicao == null ? null : Number(r.posicao) || null,
      })).filter(r => r.municipio);
    } finally {
      await conn.end();
    }
  }

  // ── Sync BI electoral data → municipios table ────────────────────────────

  async syncMunicipios(): Promise<{ updated: number; notFound: string[] }> {
    const biRows = await this.buscarMiltonPorMunicipio();

    const municipios = await this.prisma.municipio.findMany({
      where: { uf: 'SP' },
      select: { id: true, nome: true },
    });

    const normalizar = (s: string) =>
      s.toUpperCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const nameMap = new Map<string, bigint>();
    for (const m of municipios) {
      nameMap.set(normalizar(m.nome), m.id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];
    const notFound: string[] = [];

    for (const row of biRows) {
      const id = nameMap.get(normalizar(row.municipio));
      if (!id) { notFound.push(row.municipio); continue; }
      const percentual_mv = row.validos_22 > 0 ? row.votos_22 / row.validos_22 : 0;
      updates.push(
        this.prisma.municipio.update({
          where: { id },
          data: {
            votos_22: row.votos_22,
            eleitores_22: row.eleitores_22,
            votos_validos_22: row.validos_22,
            percentual_mv,
            ranking_mv: row.posicao,
          },
          select: { id: true },
        }),
      );
    }

    await this.prisma.$transaction(updates);
    return { updated: updates.length, notFound };
  }
}
