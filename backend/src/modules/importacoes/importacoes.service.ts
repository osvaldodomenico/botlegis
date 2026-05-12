import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';

const normalizeNome = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const toInt = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};

const toFloat = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};

@Injectable()
export class ImportacoesService {
  constructor(private prisma: PrismaService) {}

  async listarAbas(filePath: string, fileName: string) {
    const wb = XLSX.readFile(filePath);
    return { abas: wb.SheetNames, filePath, fileName };
  }

  async processUpload(filePath: string, fileName: string, sheetName?: string) {
    const wb = XLSX.readFile(filePath);
    const sheet = sheetName || wb.SheetNames.find(n => n.toUpperCase().includes('GERAL')) || wb.SheetNames[0];
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][];

    const headers: string[] = rows[1] as string[];
    const dataRows = rows.slice(2);

    let processadas = 0;
    let erros = 0;
    const errosList: any[] = [];

    for (const row of dataRows) {
      if (!row || row.every((v: any) => v === null)) continue;

      const municipioNome = row[headers.indexOf('MUNICIPIO')];
      if (!municipioNome) continue;

      try {
        const data = {
          nome: normalizeNome(String(municipioNome)),
          uf: 'SP',
          bloco: row[headers.indexOf('BLOCO')] ? String(row[headers.indexOf('BLOCO')]).trim() : null,
          regiao: row[headers.indexOf('REGIÃO')] ? String(row[headers.indexOf('REGIÃO')]).trim() : null,
          rm_ra: row[headers.indexOf('REGIÕES RM/RA')] ? String(row[headers.indexOf('REGIÕES RM/RA')]).trim() : null,
          mesorregiao: row[headers.indexOf('MESORREGIÃO')] ? String(row[headers.indexOf('MESORREGIÃO')]).trim() : null,
          microrregiao: row[headers.indexOf('MICRORREGIÕES GEOGRÁFICA')] ? String(row[headers.indexOf('MICRORREGIÕES GEOGRÁFICA')]).trim() : null,
          divisao_regional: row[headers.indexOf('DIVISÃO REGIONAL')] ? String(row[headers.indexOf('DIVISÃO REGIONAL')]).trim() : null,
          projecao_votos: toInt(row[headers.indexOf('PROJEÇÃO')]) ?? 0,
          coordenacao: row[headers.indexOf('COORDENAÇÃO')] ? String(row[headers.indexOf('COORDENAÇÃO')]).trim() : null,
          lideranca: row[headers.indexOf('LIDERANÇA')] ? String(row[headers.indexOf('LIDERANÇA')]).trim() : null,
          funcao_cargo: row[headers.indexOf('FUNÇÃO CARGO')] ? String(row[headers.indexOf('FUNÇÃO CARGO')]).trim() : null,
          projecao_2: toInt(row[headers.indexOf('PROJEÇÃO 2')]),
          coord_lideranca_2: row[headers.indexOf('COORD/LIDERNÇA')] ? String(row[headers.indexOf('COORD/LIDERNÇA')]).trim() : null,
          funcao_cargo_2: row[headers.indexOf('FUNÇÃO CARGO2')] ? String(row[headers.indexOf('FUNÇÃO CARGO2')]).trim() : null,
          projecao_apoio_iurd: toInt(row[headers.indexOf('PROJEÇÃO APOIO IURD')]),
          projecao_base: toInt(row[headers.indexOf('PROJEÇÃO BASE')]) ?? 0,
          eleitores_22: toInt(row[headers.indexOf('ELEITORES 22')]),
          votos_validos_22: toInt(row[headers.indexOf('VALIDOS')]),
          percentual_mv: toFloat(row[headers.indexOf('% MV')]),
          votos_22: toInt(row[headers.indexOf('VOTO22')]),
          percentual_perda: toFloat(row[headers.indexOf('% PERDA')]),
        };

        await this.prisma.municipio.upsert({
          where: { nome: data.nome },
          update: data,
          create: data,
        });

        processadas++;
      } catch (err: any) {
        erros++;
        errosList.push({ municipio: municipioNome, erro: err.message });
      }
    }

    const log = await this.prisma.logImportacao.create({
      data: {
        arquivo: fileName,
        linhas_processadas: processadas,
        linhas_com_erro: erros,
        status: erros === 0 ? 'SUCESSO' : erros < processadas ? 'PARCIAL' : 'ERRO',
        erros: errosList.length > 0 ? errosList : null,
      },
    });

    return {
      id: log.id.toString(),
      arquivo: fileName,
      linhas_processadas: processadas,
      linhas_com_erro: erros,
      status: log.status,
      erros: errosList,
    };
  }

  async limparDados() {
    await this.prisma.municipio.deleteMany({});
    await this.prisma.logImportacao.deleteMany({});
    return { message: 'Todos os dados foram apagados com sucesso.' };
  }

  async findAll() {
    const logs = await this.prisma.logImportacao.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return logs.map(l => ({ ...l, id: l.id.toString() }));
  }
}
