import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BuscaService } from '../busca/busca.service';
import { DashboardService } from '../dashboard/dashboard.service';
/* eslint-disable @typescript-eslint/no-var-requires */
import { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import * as ExcelJS from 'exceljs';
import { BotSearchService } from '../webhooks/services/bot-search.service';
import { MunicipioData } from '../webhooks/bot.types';
import { TIPO_EXTERNO, TIPO_INSTITUICAO, TIPO_APOIADORES } from '../bot/bot-menu';

// Rótulos limpos (sem emoji) para telas/relatórios
const TIPO_LABEL: Record<string, string> = {
  [TIPO_EXTERNO]: 'Externo',
  [TIPO_INSTITUICAO]: 'Base Instituição',
  [TIPO_APOIADORES]: 'Base Apoiadores',
};

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

interface DateRange {
  dataInicial?: Date;
  dataFinal?: Date;
}

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buscaService: BuscaService,
    private readonly dashboardService: DashboardService,
    private readonly botSearch: BotSearchService,
  ) {}

  private parseDateRange(dataInicial?: string, dataFinal?: string): DateRange {
    const range: DateRange = {};
    if (dataInicial) range.dataInicial = new Date(dataInicial + 'T00:00:00');
    if (dataFinal) {
      range.dataFinal = new Date(dataFinal + 'T23:59:59');
    }
    return range;
  }

  private buildDateWhere(range: DateRange) {
    const where: any = {};
    if (range.dataInicial || range.dataFinal) {
      where.updated_at = {};
      if (range.dataInicial) where.updated_at.gte = range.dataInicial;
      if (range.dataFinal) where.updated_at.lte = range.dataFinal;
    }
    return where;
  }

  private formatNumber(n: number | null | undefined): string {
    return (n || 0).toLocaleString('pt-BR');
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private buildPeriodoLabel(range: DateRange): string {
    if (range.dataInicial && range.dataFinal) {
      return `Período: ${this.formatDate(range.dataInicial)} a ${this.formatDate(range.dataFinal)}`;
    }
    if (range.dataInicial) return `A partir de ${this.formatDate(range.dataInicial)}`;
    if (range.dataFinal) return `Até ${this.formatDate(range.dataFinal)}`;
    return '';
  }

  private buildHeader(titulo: string, range?: DateRange): Content[] {
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    const header: Content[] = [
      {
        columns: [
          { text: 'BI Político MV 2026', style: 'headerLeft', width: '*' },
          { text: titulo, style: 'headerCenter', width: 'auto', alignment: 'center' },
          { text: dataAtual, style: 'headerRight', width: '*', alignment: 'right' },
        ],
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
    ];

    const periodoLabel = range ? this.buildPeriodoLabel(range) : '';
    if (periodoLabel) {
      header.push({
        text: periodoLabel,
        fontSize: 9,
        color: '#0066cc',
        alignment: 'center',
        margin: [0, 0, 0, 16] as [number, number, number, number],
      });
    } else {
      header.push({ text: '', margin: [0, 0, 0, 16] as [number, number, number, number] });
    }

    return header;
  }

  private getStyles() {
    return {
      headerLeft: { fontSize: 9, color: '#666666' },
      headerCenter: { fontSize: 14, bold: true, color: '#0066cc' },
      headerRight: { fontSize: 9, color: '#666666' },
      sectionTitle: { fontSize: 12, bold: true, color: '#1d1d1f', margin: [0, 15, 0, 8] as [number, number, number, number] },
      tableHeader: { fontSize: 9, bold: true, color: '#ffffff', fillColor: '#0066cc' },
      tableCell: { fontSize: 9, color: '#333333' },
      tableCellRight: { fontSize: 9, color: '#333333', alignment: 'right' as const },
      statLabel: { fontSize: 9, color: '#666666' },
      statValue: { fontSize: 16, bold: true, color: '#0066cc' },
    };
  }

  private tableLayout() {
    return {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e0e0e0',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    };
  }

  private generatePdf(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    const PdfPrinter = require('pdfmake/src/printer');
    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async gerarRelatorioGeral(dataInicial?: string, dataFinal?: string): Promise<Buffer> {
    const range = this.parseDateRange(dataInicial, dataFinal);
    const dateWhere = this.buildDateWhere(range);
    const hasDateFilter = !!(range.dataInicial || range.dataFinal);

    // If date filter, query directly; otherwise use dashboard service
    let stats: any;
    if (hasDateFilter) {
      stats = await this.buildFilteredStats(dateWhere);
    } else {
      stats = await this.dashboardService.getStats();
    }

    const content: Content[] = [
      ...this.buildHeader('Relatório Geral', range),
      {
        columns: [
          { stack: [{ text: 'Total Municípios', style: 'statLabel' }, { text: this.formatNumber(stats.total_municipios), style: 'statValue' }], width: '*' },
          { stack: [{ text: 'Total Projeção', style: 'statLabel' }, { text: this.formatNumber(stats.total_projecao), style: 'statValue' }], width: '*' },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { text: 'Por Tipo de Cadastro', style: 'sectionTitle' } as Content,
      {
        table: {
          headerRows: 1, widths: ['*', 'auto', 'auto'],
          body: [
            [{ text: 'Tipo', style: 'tableHeader' }, { text: 'Registros', style: 'tableHeader', alignment: 'right' }, { text: 'Projeção', style: 'tableHeader', alignment: 'right' }],
            ...stats.por_tipo.map((t: any) => [
              { text: t.tipo, style: 'tableCell' },
              { text: this.formatNumber(t.total_registros), style: 'tableCellRight' },
              { text: this.formatNumber(t.total_projecao), style: 'tableCellRight' },
            ]),
          ] as TableCell[][],
        },
        layout: this.tableLayout(),
      },
      { text: 'Por Divisão Regional', style: 'sectionTitle' } as Content,
      {
        table: {
          headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Divisão Regional', style: 'tableHeader' },
              { text: 'Municípios', style: 'tableHeader', alignment: 'right' },
              { text: 'Projeção', style: 'tableHeader', alignment: 'right' },
              { text: '% Total', style: 'tableHeader', alignment: 'right' },
            ],
            ...stats.por_divisao_regional.map((d: any) => [
              { text: d.divisao_regional || '—', style: 'tableCell' },
              { text: this.formatNumber(d.total_municipios), style: 'tableCellRight' },
              { text: this.formatNumber(d.total_projecao), style: 'tableCellRight' },
              { text: stats.total_projecao ? `${Math.round((d.total_projecao / stats.total_projecao) * 100)}%` : '0%', style: 'tableCellRight' },
            ]),
          ] as TableCell[][],
        },
        layout: this.tableLayout(),
      },
      { text: 'Top 10 - Maior Projeção', style: 'sectionTitle' } as Content,
      {
        table: {
          headerRows: 1, widths: [25, '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: '#', style: 'tableHeader' },
              { text: 'Município', style: 'tableHeader' },
              { text: 'Região', style: 'tableHeader' },
              { text: 'Votos 22', style: 'tableHeader', alignment: 'right' },
              { text: 'Projeção', style: 'tableHeader', alignment: 'right' },
            ],
            ...stats.top10_projecao.map((m: any, i: number) => [
              { text: `${i + 1}`, style: 'tableCell' },
              { text: m.nome, style: 'tableCell' },
              { text: m.regiao || '—', style: 'tableCell' },
              { text: this.formatNumber(m.votos_22), style: 'tableCellRight' },
              { text: this.formatNumber(m.projecao_votos), style: 'tableCellRight' },
            ]),
          ] as TableCell[][],
        },
        layout: this.tableLayout(),
      },
    ];

    return this.generatePdf({
      content, styles: this.getStyles(),
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
    });
  }

  async gerarRelatorioCoordenador(nome: string, dataInicial?: string, dataFinal?: string): Promise<Buffer> {
    const range = this.parseDateRange(dataInicial, dataFinal);
    const dateWhere = this.buildDateWhere(range);

    const municipios = await this.prisma.municipio.findMany({
      where: {
        ...dateWhere,
        OR: [
          { coordenacao: { contains: nome } },
          { lideranca: { contains: nome } },
          { coord_lideranca_2: { contains: nome } },
        ],
      },
      select: {
        id: true, nome: true, regiao: true, bloco: true,
        projecao_votos: true, coordenacao: true, lideranca: true,
      },
      orderBy: { nome: 'asc' },
    });

    const totalProjecao = municipios.reduce((sum, m) => sum + (m.projecao_votos || 0), 0);

    const content: Content[] = [
      ...this.buildHeader(`Coordenador: ${nome}`, range),
      {
        columns: [
          { stack: [{ text: 'Coordenador', style: 'statLabel' }, { text: nome, style: 'statValue', fontSize: 12 }], width: '*' },
          { stack: [{ text: 'Municípios', style: 'statLabel' }, { text: this.formatNumber(municipios.length), style: 'statValue' }], width: 'auto' },
          { stack: [{ text: 'Projeção Total', style: 'statLabel' }, { text: this.formatNumber(totalProjecao), style: 'statValue' }], width: 'auto' },
        ],
        columnGap: 30,
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { text: 'Municípios', style: 'sectionTitle' } as Content,
      {
        table: {
          headerRows: 1, widths: [25, '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: '#', style: 'tableHeader' },
              { text: 'Município', style: 'tableHeader' },
              { text: 'Região', style: 'tableHeader' },
              { text: 'Bloco', style: 'tableHeader' },
              { text: 'Projeção', style: 'tableHeader', alignment: 'right' },
            ],
            ...municipios.map((m, i) => [
              { text: `${i + 1}`, style: 'tableCell' },
              { text: m.nome, style: 'tableCell' },
              { text: m.regiao || '—', style: 'tableCell' },
              { text: m.bloco || '—', style: 'tableCell' },
              { text: this.formatNumber(m.projecao_votos), style: 'tableCellRight' },
            ]),
          ] as TableCell[][],
        },
        layout: this.tableLayout(),
      },
    ];

    return this.generatePdf({
      content, styles: this.getStyles(),
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
    });
  }

  async gerarRelatorioDivisao(divisao: string, dataInicial?: string, dataFinal?: string): Promise<Buffer> {
    const range = this.parseDateRange(dataInicial, dataFinal);
    const dateWhere = this.buildDateWhere(range);

    const municipios = await this.prisma.municipio.findMany({
      where: {
        ...dateWhere,
        regiao: { contains: divisao },
      },
      select: {
        id: true, nome: true, projecao_votos: true,
        coordenacao: true, eleitores_22: true,
      },
      orderBy: { projecao_votos: 'desc' },
    });

    const totalProjecao = municipios.reduce((sum, m) => sum + (m.projecao_votos || 0), 0);

    const content: Content[] = [
      ...this.buildHeader(`Divisão: ${divisao}`, range),
      {
        columns: [
          { stack: [{ text: 'Divisão Regional', style: 'statLabel' }, { text: divisao, style: 'statValue', fontSize: 12 }], width: '*' },
          { stack: [{ text: 'Municípios', style: 'statLabel' }, { text: this.formatNumber(municipios.length), style: 'statValue' }], width: 'auto' },
          { stack: [{ text: 'Projeção Total', style: 'statLabel' }, { text: this.formatNumber(totalProjecao), style: 'statValue' }], width: 'auto' },
        ],
        columnGap: 30,
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { text: 'Municípios da Divisão', style: 'sectionTitle' } as Content,
      {
        table: {
          headerRows: 1, widths: [25, '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: '#', style: 'tableHeader' },
              { text: 'Município', style: 'tableHeader' },
              { text: 'Coordenação', style: 'tableHeader' },
              { text: 'Eleitores 22', style: 'tableHeader', alignment: 'right' },
              { text: 'Projeção', style: 'tableHeader', alignment: 'right' },
            ],
            ...municipios.map((m, i) => [
              { text: `${i + 1}`, style: 'tableCell' },
              { text: m.nome, style: 'tableCell' },
              { text: m.coordenacao || '—', style: 'tableCell' },
              { text: this.formatNumber(m.eleitores_22), style: 'tableCellRight' },
              { text: this.formatNumber(m.projecao_votos), style: 'tableCellRight' },
            ]),
          ] as TableCell[][],
        },
        layout: this.tableLayout(),
      },
    ];

    return this.generatePdf({
      content, styles: this.getStyles(),
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      pageSize: 'A4', pageMargins: [40, 40, 40, 40],
    });
  }

  // Build filtered stats when date range is applied
  private async buildFilteredStats(dateWhere: any) {
    const tiposCadastro = ['EXTERNO', 'BASE - INSTITUIÇÃO', 'BASE APOIADORES'];
    const normalizeTipo = (tipo?: string | null) => (tipo || '').trim().toUpperCase();

    const todos = await this.prisma.municipio.findMany({
      where: dateWhere,
      select: {
        id: true, nome: true, regiao: true, divisao_regional: true,
        tipo_cadastro: true, projecao_votos: true,
        votos_22: true, eleitores_22: true,
      },
    });

    const cadastros = todos.filter(m => tiposCadastro.includes(normalizeTipo(m.tipo_cadastro)));
    const cidadesSet = new Set(cadastros.map(m => m.nome.toUpperCase()));
    const totalProjecao = cadastros.reduce((s, m) => s + (m.projecao_votos || 0), 0);

    // Por tipo
    const tipoMap = new Map<string, { projecao: number; registros: number }>();
    for (const m of cadastros) {
      const tipo = normalizeTipo(m.tipo_cadastro);
      const ex = tipoMap.get(tipo) || { projecao: 0, registros: 0 };
      ex.projecao += m.projecao_votos || 0;
      ex.registros++;
      tipoMap.set(tipo, ex);
    }

    // Por divisão regional
    const divMap = new Map<string, { projecao: number; municipios: Set<string> }>();
    for (const m of cadastros) {
      const div = (m.divisao_regional || '').trim();
      if (!div) continue;
      if (!divMap.has(div)) divMap.set(div, { projecao: 0, municipios: new Set() });
      const entry = divMap.get(div)!;
      entry.projecao += m.projecao_votos || 0;
      entry.municipios.add(m.nome.toUpperCase());
    }

    // Top 10 por cidade (dedup)
    const porCidade = new Map<string, { nome: string; regiao: string | null; votos_22: number; projecao: number }>();
    for (const m of cadastros) {
      const key = m.nome.toUpperCase();
      const ex = porCidade.get(key);
      if (!ex) {
        porCidade.set(key, { nome: m.nome, regiao: m.regiao, votos_22: m.votos_22 || 0, projecao: m.projecao_votos || 0 });
      } else {
        ex.projecao += m.projecao_votos || 0;
        if (m.votos_22 && m.votos_22 > ex.votos_22) ex.votos_22 = m.votos_22;
      }
    }

    const top10 = [...porCidade.values()]
      .filter(c => c.projecao > 0)
      .sort((a, b) => b.projecao - a.projecao)
      .slice(0, 10)
      .map(c => ({ nome: c.nome, regiao: c.regiao, votos_22: c.votos_22, projecao_votos: c.projecao }));

    return {
      total_municipios: cidadesSet.size,
      total_projecao: totalProjecao,
      por_tipo: [...tipoMap.entries()]
        .map(([tipo, v]) => ({ tipo, total_projecao: v.projecao, total_registros: v.registros }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      por_divisao_regional: [...divMap.entries()]
        .map(([divisao_regional, v]) => ({ divisao_regional, total_projecao: v.projecao, total_municipios: v.municipios.size }))
        .sort((a, b) => b.total_projecao - a.total_projecao),
      top10_projecao: top10,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // PARIDADE BOT ↔ RELATÓRIOS — dados JSON (mesmas agregações do menu do bot)
  // ════════════════════════════════════════════════════════════════════════

  private normTipo(t?: string | null) { return (t || '').trim().toUpperCase(); }

  private contribTotal(m: MunicipioData): number {
    return (m.projecao_votos || 0) + (m.projecao_base || 0) + (m.projecao_2 || 0) + (m.projecao_apoio_iurd || 0);
  }

  private mapRow(m: MunicipioData) {
    return {
      id: String(m.id), nome: m.nome,
      mesorregiao: m.mesorregiao, rm_ra: m.rm_ra, microrregiao: m.microrregiao,
      bloco: m.bloco, divisao_regional: m.divisao_regional, regiao: m.regiao,
      tipo_cadastro: m.tipo_cadastro,
      lideranca: m.lideranca, coordenacao: m.coordenacao, funcao_cargo: m.funcao_cargo,
      coord_lideranca_2: m.coord_lideranca_2, funcao_cargo_2: m.funcao_cargo_2,
      projecao_votos: m.projecao_votos || 0, projecao_base: m.projecao_base || 0,
      projecao_2: m.projecao_2 || 0, projecao_apoio_iurd: m.projecao_apoio_iurd || 0,
      projecao_total: this.contribTotal(m),
      votos_22: m.votos_22 || 0, eleitores_22: m.eleitores_22 || 0, votos_validos_22: m.votos_validos_22 || 0,
      percentual_mv: m.percentual_mv, ranking_mv: m.ranking_mv,
      candidato_nome: m.candidato_nome, candidato_cargo: m.candidato_cargo,
    };
  }

  // 1) Município — mesmos dados de "Consultar Município" do bot
  async dadosMunicipio(nome: string) {
    const termo = (nome || '').trim();
    if (!termo) return { encontrado: false, termo, sugestoes: [] };
    const mun = await this.botSearch.buscarMunicipio(termo);
    if (!mun) {
      const sug = await this.botSearch.buscarSugestoes(termo, 8);
      return { encontrado: false, termo, sugestoes: sug.map(s => ({ nome: s.nome, mesorregiao: s.mesorregiao })) };
    }
    const linhas = await this.botSearch.buscarTodasLinhasMunicipio(mun.nome);
    const registros = linhas.map(l => this.mapRow(l));
    const votos22 = linhas[0]?.votos_22 || 0;
    const projecaoTotal = linhas.reduce((s, l) => s + this.contribTotal(l), 0);
    const tipoMap = new Map<string, { projecao: number; registros: number }>();
    for (const l of linhas) {
      const t = this.normTipo(l.tipo_cadastro);
      const e = tipoMap.get(t) || { projecao: 0, registros: 0 };
      e.projecao += this.contribTotal(l); e.registros++;
      tipoMap.set(t, e);
    }
    return {
      encontrado: true,
      nome: mun.nome,
      geografia: { mesorregiao: mun.mesorregiao, rm_ra: mun.rm_ra, microrregiao: mun.microrregiao, bloco: mun.bloco, divisao_regional: mun.divisao_regional, regiao: mun.regiao },
      dados_2022: { votos_22: votos22, eleitores_22: mun.eleitores_22 || 0, votos_validos_22: mun.votos_validos_22 || 0, percentual_mv: mun.percentual_mv, ranking_mv: mun.ranking_mv },
      registros,
      por_tipo: [...tipoMap.entries()].map(([tipo, v]) => ({ tipo, label: TIPO_LABEL[tipo] || tipo, projecao: v.projecao, registros: v.registros })).sort((a, b) => b.projecao - a.projecao),
      totais: { projecao_total: projecaoTotal, meta_minima: votos22 + projecaoTotal },
    };
  }

  // Consolida cidades (usado por Região e Lideranças)
  private resumirCidades(tipo: string, valor: string, cidades: MunicipioData[]) {
    const porCidade = new Map<string, MunicipioData[]>();
    for (const c of cidades) { const a = porCidade.get(c.nome) || []; a.push(c); porCidade.set(c.nome, a); }
    let totalVotos22 = 0, totalProj = 0;
    const lista = [...porCidade.entries()].map(([nomeCidade, rows]) => {
      const base = rows[0];
      const proj = rows.reduce((s, r) => s + this.contribTotal(r), 0);
      totalVotos22 += base.votos_22 || 0; totalProj += proj;
      const lideres = rows.flatMap(r => {
        const arr: Array<{ nome: string; funcao: string | null; tipo: string | null; projecao: number }> = [];
        if (r.lideranca) arr.push({ nome: r.lideranca, funcao: r.funcao_cargo, tipo: r.tipo_cadastro, projecao: r.projecao_votos || 0 });
        if (r.coord_lideranca_2) arr.push({ nome: r.coord_lideranca_2, funcao: r.funcao_cargo_2, tipo: r.tipo_cadastro, projecao: r.projecao_2 || 0 });
        return arr;
      });
      return { nome: nomeCidade, votos_22: base.votos_22 || 0, eleitores_22: base.eleitores_22 || 0, votos_validos_22: base.votos_validos_22 || 0, percentual_mv: base.percentual_mv, ranking_mv: base.ranking_mv, bloco: base.bloco, mesorregiao: base.mesorregiao, projecao: proj, lideres };
    }).sort((a, b) => b.projecao - a.projecao);
    return { tipo, valor, totais: { municipios: porCidade.size, registros: cidades.length, votos_22: totalVotos22, projecao_total: totalProj }, cidades: lista };
  }

  // 2) Região / subdivisão — mesmos dados de "Consultar Região" do bot
  async dadosRegiao(valor: string) {
    const termo = (valor || '').trim();
    if (!termo) return { encontrado: false, termo };
    let tipo = 'Região', nome = termo;
    let cidades: MunicipioData[] = [];
    const reg = this.botSearch.detectarRegiao(termo);
    if (reg) {
      cidades = await this.botSearch.buscarMunicipiosPorRegiao(reg.campo, reg.valor);
      nome = reg.valor;
    } else {
      const sub = await this.botSearch.buscarPorSubdivisao(termo);
      if (sub) { tipo = sub.tipo; nome = sub.valor; cidades = sub.cidades; }
    }
    if (cidades.length === 0) return { encontrado: false, termo };
    return { encontrado: true, ...this.resumirCidades(tipo, nome, cidades) };
  }

  // 3) Lideranças — mesmos dados de "Lideranças" do bot
  async dadosLiderancas(termo: string) {
    const t = (termo || '').trim();
    if (!t) return { encontrado: false, termo: t, cidades: [], totais: null };
    const cidades = await this.botSearch.buscarPorLideranca(t);
    if (cidades.length === 0) return { encontrado: false, termo: t, cidades: [], totais: null };
    const r = this.resumirCidades('Lideranças', t, cidades);
    return { encontrado: true, termo: t, cidades: r.cidades, totais: r.totais };
  }

  // 4) Bloco — lista de blocos + Base Instituição por bloco (igual ao bot)
  async listarBlocosInstituicao() {
    return this.botSearch.listarBlocos(TIPO_INSTITUICAO);
  }

  async dadosBloco(bloco: string) {
    const b = (bloco || '').trim();
    if (!b) return { encontrado: false, bloco: b, registros: [], totais: null };
    const regs = await this.botSearch.registrosPorBlocoTipo(b, TIPO_INSTITUICAO);
    if (regs.length === 0) return { encontrado: false, bloco: b, registros: [], totais: null };
    const registros = regs.map(r => this.mapRow(r));
    const total = regs.reduce((s, r) => s + (r.projecao_votos || 0), 0);
    const municipios = new Set(regs.map(r => r.nome.toUpperCase())).size;
    return { encontrado: true, bloco: b, registros, totais: { registros: regs.length, municipios, projecao_total: total } };
  }

  // 5) Bases de Apoio — projeção por bloco × tipo (igual ao bot)
  async dadosBases(tipo?: string) {
    if (tipo) {
      const t = this.normTipo(tipo);
      const { blocos, total } = await this.botSearch.projecaoPorBlocoTipo(t);
      return { tipo: t, label: TIPO_LABEL[t] || t, blocos, total };
    }
    const tipos = [TIPO_APOIADORES, TIPO_INSTITUICAO, TIPO_EXTERNO];
    const resultado: Array<{ tipo: string; label: string; blocos: any[]; total: number }> = [];
    let totalGeral = 0;
    for (const t of tipos) {
      const { blocos, total } = await this.botSearch.projecaoPorBlocoTipo(t);
      totalGeral += total;
      resultado.push({ tipo: t, label: TIPO_LABEL[t] || t, blocos, total });
    }
    return { tipos: resultado, total_geral: totalGeral };
  }

  // ════════════════════════════════════════════════════════════════════════
  // RAIO-X DA CAMPANHA — visão executiva (KPIs, funil, SWOT, saúde)
  // Semântica: projeção (cenário do trabalho atual) é ISOLADA; 2022 é
  // referência histórica e NUNCA é somado à projeção.
  // ════════════════════════════════════════════════════════════════════════

  private readonly TOTAL_SP_MUNICIPIOS = 645;
  // Total oficial de votos do MV em 2022 (TSE). O somatório bruto da tabela
  // `municipios` traz ruído (~+438 por inconsistências de linhas); a referência
  // executiva usa o número oficial para preservar a credibilidade.
  private readonly VOTOS_MV_2022_OFICIAL = 98557;

  async raioX() {
    const TIPOS = ['EXTERNO', 'BASE - INSTITUIÇÃO', 'BASE APOIADORES'];
    const norm = (t?: string | null) => (t || '').trim().toUpperCase();

    const todos = await this.prisma.municipio.findMany({
      select: {
        id: true, nome: true, regiao: true, bloco: true, rm_ra: true, divisao_regional: true, mesorregiao: true,
        tipo_cadastro: true, projecao_votos: true, projecao_base: true, projecao_2: true, projecao_apoio_iurd: true,
        votos_22: true, eleitores_22: true, votos_validos_22: true, percentual_mv: true, ranking_mv: true,
        lideranca: true, coordenacao: true, coord_lideranca_2: true,
      },
    });

    const cadastros = todos.filter(m => TIPOS.includes(norm(m.tipo_cadastro)));
    const projOf = (m: any) => m.projecao_votos || 0;

    // ── Cidades distintas (universo presente) e por cidade ──────────────────
    // chave normalizada (sem acento/caixa/espaço) p/ a linha-mestre do município
    // casar com os cadastros das 3 bases mesmo com grafia diferente (ex.:
    // "São José do Rio Preto" vs "SAO JOSE DO RIO PRETO").
    const chaveCidade = (s: string) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toUpperCase();
    const cidades = new Map<string, { nome: string; regiao: string | null; bloco: string | null; divisao: string | null; mesorregiao: string | null; votos22: number; eleitores22: number; projecao: number; temLider: boolean; temCadastro: boolean; }>();
    for (const m of todos) {
      const key = chaveCidade(m.nome);
      if (!cidades.has(key)) {
        cidades.set(key, { nome: m.nome, regiao: m.regiao, bloco: m.bloco, divisao: m.divisao_regional, mesorregiao: m.mesorregiao, votos22: m.votos_22 || 0, eleitores22: m.eleitores_22 || 0, projecao: 0, temLider: false, temCadastro: false });
      }
      const c = cidades.get(key)!;
      if ((m.votos_22 || 0) > c.votos22) c.votos22 = m.votos_22 || 0;
      if ((m.eleitores_22 || 0) > c.eleitores22) c.eleitores22 = m.eleitores_22 || 0;
      if (!c.bloco && m.bloco) c.bloco = m.bloco;
      if (!c.divisao && m.divisao_regional) c.divisao = m.divisao_regional;
      const ehCadastro = TIPOS.includes(norm(m.tipo_cadastro));
      if (ehCadastro) {
        c.temCadastro = true;
        c.projecao += projOf(m);
        if (m.lideranca || m.coord_lideranca_2) c.temLider = true;
      }
    }
    const listaCidades = [...cidades.values()];

    // ── Totais (sem somar 2022 + projeção) ──────────────────────────────────
    const projecaoTotal = cadastros.reduce((s, m) => s + projOf(m), 0);
    const votos2022Total = this.VOTOS_MV_2022_OFICIAL; // referência oficial TSE (não soma a projeção)
    const eleitoresTotal = listaCidades.reduce((s, c) => s + c.eleitores22, 0);
    const variacaoVs2022 = votos2022Total > 0 ? projecaoTotal / votos2022Total - 1 : 0;

    // ── Cobertura / funil ───────────────────────────────────────────────────
    const comCadastro = listaCidades.filter(c => c.temCadastro);
    const comLideranca = comCadastro.filter(c => c.temLider);
    const comProjecao = comCadastro.filter(c => c.projecao > 0);
    const funil = [
      { etapa: 'Municípios SP', valor: this.TOTAL_SP_MUNICIPIOS },
      { etapa: 'Com cadastro', valor: comCadastro.length },
      { etapa: 'Com liderança', valor: comLideranca.length },
      { etapa: 'Com projeção', valor: comProjecao.length },
    ];
    const coberturaPct = comCadastro.length / this.TOTAL_SP_MUNICIPIOS;
    const taxaLideranca = comCadastro.length ? comLideranca.length / comCadastro.length : 0;
    const zonasBrancas = this.TOTAL_SP_MUNICIPIOS - comCadastro.length;

    // ── Estrutura de pessoas ────────────────────────────────────────────────
    const lideres = new Set<string>();
    for (const m of cadastros) { if (m.lideranca) lideres.add(norm(m.lideranca)); if (m.coord_lideranca_2) lideres.add('L2:' + norm(m.coord_lideranca_2)); }
    const coordMap = new Map<string, { nome: string; projecao: number; municipios: Set<string>; porTipo: Map<string, number> }>();
    for (const m of cadastros) {
      if (!m.coordenacao) continue;
      const k = norm(m.coordenacao);
      if (!coordMap.has(k)) coordMap.set(k, { nome: m.coordenacao, projecao: 0, municipios: new Set(), porTipo: new Map() });
      const e = coordMap.get(k)!; const p = projOf(m); e.projecao += p; e.municipios.add(m.nome.toUpperCase());
      const tt = norm(m.tipo_cadastro); e.porTipo.set(tt, (e.porTipo.get(tt) || 0) + p);
    }
    // tipo dominante do coordenador (de onde vem a maior projeção) p/ colorir a barra
    const tipoDominante = (pt: Map<string, number>) => {
      const arr = [...pt.entries()].sort((a, b) => b[1] - a[1]);
      return arr.length ? arr[0][0] : 'EXTERNO';
    };
    const coordenadores = [...coordMap.values()].map(c => ({ nome: c.nome, projecao: c.projecao, municipios: c.municipios.size, tipo: tipoDominante(c.porTipo) })).sort((a, b) => b.projecao - a.projecao);
    const depMaiorCoord = projecaoTotal > 0 && coordenadores[0] ? coordenadores[0].projecao / projecaoTotal : 0;

    // ── Mix por tipo de base ────────────────────────────────────────────────
    const mixMap = new Map<string, number>();
    for (const m of cadastros) mixMap.set(norm(m.tipo_cadastro), (mixMap.get(norm(m.tipo_cadastro)) || 0) + projOf(m));
    const mix = TIPOS.map(t => ({ tipo: t, label: TIPO_LABEL[t] || t, projecao: mixMap.get(t) || 0, pct: projecaoTotal ? (mixMap.get(t) || 0) / projecaoTotal : 0 }));
    const pctExterno = projecaoTotal ? (mixMap.get('EXTERNO') || 0) / projecaoTotal : 0;
    const pctInstituicao = projecaoTotal ? (mixMap.get('BASE - INSTITUIÇÃO') || 0) / projecaoTotal : 0;

    // ── Território (estrutura real: EXTERNO | BASE INSTITUIÇÃO | BASE APOIADORES) ──
    // Cada barra carrega seu `tipo` (categoria) para o front colorir e o leitor
    // saber "quem é de quem". EXTERNO NÃO soma tudo numa barra: divide pelas 2
    // maiores divisões regionais + "Demais". Base Instituição vai por bloco +
    // coordenador; Base Apoiadores por bloco (cidade). Agrupado por categoria.
    const EXT = 'EXTERNO', INST = 'BASE - INSTITUIÇÃO', APO = 'BASE APOIADORES';
    type TGrp = { label: string; tipo: string; ordem: number; demais: boolean; projecao: number; municipios: Set<string> };
    const grupos = new Map<string, TGrp>();
    const addTerr = (key: string, label: string, tipo: string, ordem: number, demais: boolean, m: any) => {
      if (!grupos.has(key)) grupos.set(key, { label, tipo, ordem, demais, projecao: 0, municipios: new Set() });
      const g = grupos.get(key)!; g.projecao += projOf(m); g.municipios.add(m.nome.toUpperCase());
    };

    // Coordenador dominante por bloco (Base Instituição) p/ rotular a barra.
    const coordContagem = new Map<string, Map<string, number>>();
    for (const m of cadastros) {
      if (norm(m.tipo_cadastro) !== INST) continue;
      const b = (m.bloco || '').trim(); const c = (m.coordenacao || '').trim();
      if (!b || !c) continue;
      if (!coordContagem.has(b)) coordContagem.set(b, new Map());
      const cm = coordContagem.get(b)!; cm.set(c, (cm.get(c) || 0) + 1);
    }
    const coordDoBloco = (b: string) => {
      const cm = coordContagem.get(b); if (!cm) return '';
      return [...cm.entries()].sort((x, y) => y[1] - x[1])[0][0];
    };

    // EXTERNO: as 2 maiores divisões regionais viram barra própria; o resto = "Demais".
    const extPorDiv = new Map<string, number>();
    for (const m of cadastros) {
      if (norm(m.tipo_cadastro) !== EXT) continue;
      const dv = (m.divisao_regional || '').trim();
      if (dv) extPorDiv.set(dv, (extPorDiv.get(dv) || 0) + projOf(m));
    }
    // pelo menos 5 nomes no EXTERNO; o restante vira "DEMAIS CIDADES".
    const topDivsExt = new Set([...extPorDiv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([dv]) => dv));

    // Rótulos SEM prefixo de categoria (a cor/legenda já indica o tipo). A `key`
    // mantém cada barra única mesmo quando dois nomes se repetem entre categorias.
    for (const m of cadastros) {
      const t = norm(m.tipo_cadastro);
      if (t === EXT) {
        const dv = (m.divisao_regional || '').trim();
        const nomeado = !!dv && topDivsExt.has(dv);
        addTerr(nomeado ? `EXT:${dv}` : 'EXT:__demais', nomeado ? dv : 'DEMAIS CIDADES', EXT, 1, !nomeado, m);
      } else if (t === INST) {
        const b = (m.bloco || '').trim() || '(sem bloco)';
        const coord = coordDoBloco(b);
        addTerr(`INST:${b}`, coord ? `${b} (${coord})` : b, INST, 2, false, m);
      } else if (t === APO) {
        const b = (m.bloco || '').trim() || '(sem bloco)';
        addTerr(`APO:${b}`, b, APO, 3, false, m);
      }
    }
    const territorio = [...grupos.entries()]
      .map(([key, g]) => ({ key, ...g }))
      .sort((a, b) => a.ordem - b.ordem || (a.demais ? 1 : 0) - (b.demais ? 1 : 0) || b.projecao - a.projecao)
      .map(g => ({ key: g.key, divisao: g.label, tipo: g.tipo, projecao: g.projecao, municipios: g.municipios.size, eleitores: 0, penetracao: 0 }));

    // ── Concentração (Pareto) ───────────────────────────────────────────────
    const ranking = [...comProjecao].sort((a, b) => b.projecao - a.projecao);
    const top10 = ranking.slice(0, 10).reduce((s, c) => s + c.projecao, 0);
    const top20 = ranking.slice(0, 20).reduce((s, c) => s + c.projecao, 0);
    const paretoTop10 = projecaoTotal ? top10 / projecaoTotal : 0;
    const paretoTop20 = projecaoTotal ? top20 / projecaoTotal : 0;
    let acum = 0, cidades80 = 0;
    for (const c of ranking) { acum += c.projecao; cidades80++; if (acum >= projecaoTotal * 0.8) break; }

    // ── Oportunidades (grande eleitorado, baixa presença) ───────────────────
    // Projeção da REGIÃO por cidade-polo: soma os cadastros (3 bases) cujo bloco
    // (ou divisão regional, p/ externo) tem o nome da cidade. Ex.: Sorocaba tem
    // projeção própria 0, mas a região (bloco SOROCABA = Alumínio, Socorro…) tem 1.987.
    const regiaoProj = new Map<string, number>();
    for (const m of cadastros) {
      const reg = chaveCidade((m.bloco || '').trim() || (m.divisao_regional || '').trim());
      if (!reg) continue;
      regiaoProj.set(reg, (regiaoProj.get(reg) || 0) + projOf(m));
    }
    const oportunidades = listaCidades
      .filter(c => c.eleitores22 > 30000)
      .map(c => ({ nome: c.nome, eleitores: c.eleitores22, votos22: c.votos22, projecao: c.projecao, projecaoRegiao: regiaoProj.get(chaveCidade(c.nome)) || 0, penetracaoProj: c.eleitores22 ? c.projecao / c.eleitores22 : 0, divisao: c.divisao }))
      .sort((a, b) => a.penetracaoProj - b.penetracaoProj || b.eleitores - a.eleitores)
      .slice(0, 15);

    // ── Top cidades (forças) ────────────────────────────────────────────────
    const topCidades = ranking.slice(0, 10).map(c => ({ nome: c.nome, projecao: c.projecao, votos22: c.votos22, eleitores: c.eleitores22, divisao: c.divisao }));

    // ── Índice de Saúde (0-100, composto) ───────────────────────────────────
    const nrm = (x: number) => Math.max(0, Math.min(1, x));
    const sCobertura = nrm(coberturaPct);                       // peso 25
    const sLideranca = nrm(taxaLideranca);                      // peso 20
    const sDiversificacao = nrm(1 - paretoTop10);              // peso 20 (menos concentração = melhor)
    const sMix = nrm(1 - pctExterno);                           // peso 15 (menos volátil = melhor)
    const sCrescimento = nrm(variacaoVs2022 / 0.4);            // peso 20 (40%+ = nota cheia)
    const saudeScore = Math.round((sCobertura * 25 + sLideranca * 20 + sDiversificacao * 20 + sMix * 15 + sCrescimento * 20));
    const saudeNivel = saudeScore >= 70 ? 'verde' : saudeScore >= 50 ? 'amarelo' : 'vermelho';
    const saudeComponentes = [
      { nome: 'Cobertura territorial', valor: Math.round(sCobertura * 100), peso: 25 },
      { nome: 'Estrutura de liderança', valor: Math.round(sLideranca * 100), peso: 20 },
      { nome: 'Diversificação (anti-concentração)', valor: Math.round(sDiversificacao * 100), peso: 20 },
      { nome: 'Mix de base (estabilidade)', valor: Math.round(sMix * 100), peso: 15 },
      { nome: 'Crescimento projetado vs 2022', valor: Math.round(sCrescimento * 100), peso: 20 },
    ];

    // ── SWOT auto-derivado (quantificado) ───────────────────────────────────
    const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
    const num = (x: number) => this.formatNumber(x);
    const oportEleitores = oportunidades.reduce((s, o) => s + o.eleitores, 0);
    const swot = {
      forcas: [
        `Cenário projetado de *${num(projecaoTotal)}* votos com a estrutura atual (${pct(variacaoVs2022)} vs 2022).`,
        `Top 10 cidades somam ${num(top10)} votos projetados (${pct(paretoTop10)} do total).`,
        pctInstituicao > 0.3 ? `Base institucional sólida: ${pct(pctInstituicao)} da projeção vem da Base Instituição.` : `Presença em ${comCadastro.length} municípios com cadastro ativo.`,
        `${coordenadores.length} coordenadores e ${lideres.size} lideranças mobilizadas.`,
      ],
      fraquezas: [
        `Cobertura de apenas ${pct(coberturaPct)} dos 645 municípios de SP (${comCadastro.length} com cadastro).`,
        `${comCadastro.length - comLideranca.length} municípios cadastrados ainda sem liderança definida.`,
        paretoTop10 > 0.6 ? `Alta concentração: ${pct(paretoTop10)} da meta em só 10 cidades — fragilidade estrutural.` : `${cidades80} cidades concentram 80% da projeção.`,
        `${comCadastro.length - comProjecao.length} municípios com cadastro mas sem projeção lançada.`,
      ],
      oportunidades: [
        `${oportunidades.length} municípios de grande eleitorado (${num(oportEleitores)} eleitores) com presença quase nula — maior ROI de expansão.`,
        oportunidades[0] ? `Destaques: ${oportunidades.slice(0, 4).map(o => o.nome).join(', ')}.` : 'Expandir para grandes centros ainda não trabalhados.',
        `Penetração projetada média ainda baixa — espaço para crescer em ${num(eleitoresTotal)} eleitores mapeados.`,
      ],
      ameacas: [
        `${zonasBrancas} municípios sem qualquer cadastro (zonas brancas) — espaço livre para adversários.`,
        depMaiorCoord > 0.25 ? `Dependência de pessoa-chave: maior coordenador responde por ${pct(depMaiorCoord)} da projeção.` : `Risco de concentração por coordenador sob controle (${pct(depMaiorCoord)} no maior).`,
        pctExterno > 0.5 ? `Base volátil: ${pct(pctExterno)} da projeção é "Externo" (sem âncora institucional).` : `Mix de base com ${pct(pctExterno)} de votos externos (monitorar volatilidade).`,
      ],
    };

    return {
      gerado_em: this.timestamp(),
      saude: { score: saudeScore, nivel: saudeNivel, componentes: saudeComponentes },
      kpis: {
        projecao_total: projecaoTotal,
        votos_2022: votos2022Total,
        variacao_vs_2022: variacaoVs2022,
        cobertura_pct: coberturaPct,
        municipios_cadastro: comCadastro.length,
        total_sp: this.TOTAL_SP_MUNICIPIOS,
        municipios_com_lideranca: comLideranca.length,
        municipios_com_projecao: comProjecao.length,
        zonas_brancas: zonasBrancas,
        lideres: lideres.size,
        coordenadores: coordenadores.length,
        eleitores_total: eleitoresTotal,
      },
      funil,
      mix,
      territorio,
      concentracao: { pareto_top10: paretoTop10, pareto_top20: paretoTop20, cidades_80pct: cidades80, dep_maior_coordenador: depMaiorCoord },
      oportunidades,
      top_cidades: topCidades,
      coordenadores: coordenadores.slice(0, 15),
      swot,
    };
  }

  // RAIO-X detalhado de UMA base (Externo / Instituição / Apoiadores)
  async raioXBase(tipoParam: string) {
    const TIPOS = ['EXTERNO', 'BASE - INSTITUIÇÃO', 'BASE APOIADORES'];
    const norm = (t?: string | null) => (t || '').trim().toUpperCase();
    const tipo = norm(tipoParam);
    if (!TIPOS.includes(tipo)) throw new NotFoundException(`Tipo de base inválido: ${tipoParam}`);

    const todos = await this.prisma.municipio.findMany({
      select: {
        nome: true, regiao: true, bloco: true, divisao_regional: true, mesorregiao: true,
        tipo_cadastro: true, projecao_votos: true, projecao_2: true,
        votos_22: true, eleitores_22: true,
        lideranca: true, funcao_cargo: true, coordenacao: true, coord_lideranca_2: true, funcao_cargo_2: true,
      },
    });
    const projOf = (m: any) => m.projecao_votos || 0;
    const totalGeral = todos.filter(m => TIPOS.includes(norm(m.tipo_cadastro))).reduce((s, m) => s + projOf(m), 0);
    const rows = todos.filter(m => norm(m.tipo_cadastro) === tipo);
    const projecaoTotal = rows.reduce((s, m) => s + projOf(m), 0);

    const cidadeMap = new Map<string, { nome: string; votos22: number; eleitores: number; projecao: number; divisao: string | null; bloco: string | null }>();
    for (const m of rows) {
      const key = m.nome.toUpperCase();
      if (!cidadeMap.has(key)) cidadeMap.set(key, { nome: m.nome, votos22: m.votos_22 || 0, eleitores: m.eleitores_22 || 0, projecao: 0, divisao: m.divisao_regional, bloco: m.bloco });
      const c = cidadeMap.get(key)!;
      c.projecao += projOf(m);
      if ((m.votos_22 || 0) > c.votos22) c.votos22 = m.votos_22 || 0;
      if ((m.eleitores_22 || 0) > c.eleitores) c.eleitores = m.eleitores_22 || 0;
    }
    const cidadesArr = [...cidadeMap.values()];
    const votos2022 = cidadesArr.reduce((s, c) => s + c.votos22, 0);
    const eleitores = cidadesArr.reduce((s, c) => s + c.eleitores, 0);

    const blocosRaw = (await this.botSearch.projecaoPorBlocoTipo(tipo)).blocos;
    // Consistência com o RAIO-X: registros sem bloco aparecem como "EXTERNO"
    const blocos = blocosRaw.map((b: any) => ({ ...b, bloco: b.bloco === 'SEM BLOCO' ? 'EXTERNO' : b.bloco }));

    const divMap = new Map<string, { projecao: number; municipios: Set<string> }>();
    for (const m of rows) {
      const dv = (m.divisao_regional || m.regiao || m.mesorregiao || 'SEM DIVISÃO').trim();
      if (!divMap.has(dv)) divMap.set(dv, { projecao: 0, municipios: new Set() });
      const e = divMap.get(dv)!; e.projecao += projOf(m); e.municipios.add(m.nome.toUpperCase());
    }
    const divisoes = [...divMap.entries()].map(([divisao, v]) => ({ divisao, projecao: v.projecao, municipios: v.municipios.size })).sort((a, b) => b.projecao - a.projecao);

    const lidMap = new Map<string, { nome: string; cargo: string | null; projecao: number; cidade: string }>();
    for (const m of rows) {
      if (m.lideranca) { const k = norm(m.lideranca); if (!lidMap.has(k)) lidMap.set(k, { nome: m.lideranca, cargo: m.funcao_cargo, projecao: 0, cidade: m.nome }); lidMap.get(k)!.projecao += m.projecao_votos || 0; }
      if (m.coord_lideranca_2) { const k = norm(m.coord_lideranca_2); if (!lidMap.has(k)) lidMap.set(k, { nome: m.coord_lideranca_2, cargo: m.funcao_cargo_2, projecao: 0, cidade: m.nome }); lidMap.get(k)!.projecao += m.projecao_2 || 0; }
    }
    const liderancas = [...lidMap.values()].sort((a, b) => b.projecao - a.projecao);

    const coordMap = new Map<string, { nome: string; projecao: number; municipios: Set<string> }>();
    for (const m of rows) { if (!m.coordenacao) continue; const k = norm(m.coordenacao); if (!coordMap.has(k)) coordMap.set(k, { nome: m.coordenacao, projecao: 0, municipios: new Set() }); const e = coordMap.get(k)!; e.projecao += projOf(m); e.municipios.add(m.nome.toUpperCase()); }
    const coordenadores = [...coordMap.values()].map(c => ({ nome: c.nome, projecao: c.projecao, municipios: c.municipios.size })).sort((a, b) => b.projecao - a.projecao);

    const topCidades = [...cidadesArr].sort((a, b) => b.projecao - a.projecao).slice(0, 15);
    const pctDoTotal = totalGeral ? projecaoTotal / totalGeral : 0;
    const penetracao = eleitores ? projecaoTotal / eleitores : 0;

    const num = (x: number) => this.formatNumber(x);
    const pc = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
    const topBloco = blocos[0];
    const label = TIPO_LABEL[tipo] || tipo;
    const descritivo = [
      `A base *${label}* projeta *${num(projecaoTotal)}* votos no cenário do trabalho atual — *${pc(pctDoTotal)}* do total projetado da campanha.`,
      `Presente em *${cidadeMap.size}* municípios e *${blocos.length}* blocos${topBloco ? `, com maior força em *${topBloco.bloco}* (${num(topBloco.projecao)} votos)` : ''}.`,
      `Conta com *${liderancas.length}* lideranças e *${coordenadores.length}* coordenadores.${coordenadores[0] ? ` Maior coordenador: *${coordenadores[0].nome}* (${num(coordenadores[0].projecao)} votos, ${coordenadores[0].municipios} municípios).` : ''}`,
      `Referência histórica: essas cidades somaram *${num(votos2022)}* votos em 2022 (não somados à projeção). Penetração projetada sobre o eleitorado mapeado: *${pc(penetracao)}*.`,
    ];

    return {
      gerado_em: this.timestamp(),
      tipo, label,
      kpis: { projecao_total: projecaoTotal, pct_do_total: pctDoTotal, municipios: cidadeMap.size, lideres: liderancas.length, coordenadores: coordenadores.length, votos_2022: votos2022, eleitores, penetracao },
      blocos, divisoes,
      top_cidades: topCidades,
      liderancas: liderancas.slice(0, 20),
      coordenadores: coordenadores.slice(0, 15),
      descritivo,
    };
  }

  async raioXBaseExport(tipo: string, formato: string): Promise<{ buffer: Buffer; arquivo: string; mime: string }> {
    const d: any = await this.raioXBase(tipo);
    const pctTxt = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
    const limpar = (s: string) => s.replace(/\*/g, '');
    const tabelas: ExportTabela[] = [];
    tabelas.push({
      nome: 'Resumo',
      resumo: [
        { label: 'Projeção', value: this.formatNumber(d.kpis.projecao_total) },
        { label: '% do total', value: pctTxt(d.kpis.pct_do_total) },
        { label: 'Municípios', value: this.formatNumber(d.kpis.municipios) },
      ],
      colunas: [{ header: 'Indicador', key: 'k' }, { header: 'Valor', key: 'v' }],
      linhas: [
        { k: 'Projeção 2026 (cenário atual)', v: this.formatNumber(d.kpis.projecao_total) },
        { k: '% do total projetado da campanha', v: pctTxt(d.kpis.pct_do_total) },
        { k: 'Municípios com esta base', v: this.formatNumber(d.kpis.municipios) },
        { k: 'Lideranças', v: this.formatNumber(d.kpis.lideres) },
        { k: 'Coordenadores', v: this.formatNumber(d.kpis.coordenadores) },
        { k: 'Votos 2022 (referência)', v: this.formatNumber(d.kpis.votos_2022) },
        { k: 'Penetração projetada', v: pctTxt(d.kpis.penetracao) },
      ],
    });
    tabelas.push({ nome: 'Descritivo', colunas: [{ header: 'Análise', key: 'p' }], linhas: d.descritivo.map((p: string) => ({ p: limpar(p) })) });
    tabelas.push({ nome: 'PROJEÇÕES', colunas: [{ header: 'Bloco', key: 'bloco' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.blocos });
    tabelas.push({ nome: 'Por Divisão', colunas: [{ header: 'Divisão Regional', key: 'divisao' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.divisoes });
    tabelas.push({ nome: 'Top Cidades', colunas: [{ header: 'Município', key: 'nome' }, { header: 'Votos 22', key: 'votos22', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.top_cidades });
    tabelas.push({ nome: 'Lideranças', colunas: [{ header: 'Liderança', key: 'nome' }, { header: 'Cargo', key: 'cargo' }, { header: 'Cidade', key: 'cidade' }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.liderancas.map((l: any) => ({ nome: l.nome, cargo: l.cargo || '—', cidade: l.cidade, projecao: l.projecao })) });
    tabelas.push({ nome: 'Coordenadores', colunas: [{ header: 'Coordenador', key: 'nome' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.coordenadores });

    const titulo = `RAIO-X DA BASE — ${d.label} · Milton Vieira 2026`;
    const safe = `raio-x-base-${d.label}`.replace(/[^a-zA-Z0-9]/g, '_');
    if (formato === 'xlsx' || formato === 'excel') return { buffer: await this.toExcel(titulo, tabelas), arquivo: `${safe}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    return { buffer: await this.toPdf(titulo, tabelas), arquivo: `${safe}.pdf`, mime: 'application/pdf' };
  }

  // Rodapé padrão (SHIFTWORKS + carimbo de geração) para todos os PDFs
  private pdfFooter(): any {
    const ts = this.timestamp();
    return (currentPage: number, pageCount: number) => ({
      margin: [36, 8, 36, 0] as [number, number, number, number],
      columns: [
        { text: 'SHIFTWORKS TECNOLOGIA E MARKETING DO BRASIL', fontSize: 7, color: '#999999' },
        { text: `Relatório gerado em: ${ts}`, fontSize: 7, color: '#999999', alignment: 'center' },
        { text: `${currentPage}/${pageCount}`, fontSize: 7, color: '#999999', alignment: 'right' },
      ],
    });
  }

  // ── RAIO-X PDF executivo (cards + semáforo + SWOT, espelhando a tela) ─────
  private async raioXPdf(d: any): Promise<Buffer> {
    const num = (x: number) => this.formatNumber(x);
    const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
    const limpar = (s: string) => s.replace(/\*/g, '');
    const COR: Record<string, string> = { verde: '#34c759', amarelo: '#ff9f0a', vermelho: '#ff3b30', primary: '#0066cc' };
    const corSaude = COR[d.saude.nivel] || COR.primary;

    // Card de KPI (caixa preenchida com rótulo + valor)
    const card = (label: string, value: string, color?: string, sub?: string) => ({
      table: { widths: ['*'], heights: [44], body: [[{
        border: [false, false, false, false],
        fillColor: '#f5f5f7',
        margin: [8, 6, 8, 6] as [number, number, number, number],
        stack: [
          { text: label, fontSize: 7.5, color: '#86868b' },
          { text: value, fontSize: 15, bold: true, color: color || '#1d1d1f', margin: [0, 2, 0, 0] as [number, number, number, number] },
          ...(sub ? [{ text: sub, fontSize: 7, color: '#86868b', margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
        ],
      }]] },
      layout: 'noBorders',
    });
    const cardRow = (cards: any[]) => ({ columns: cards, columnGap: 8, margin: [0, 0, 0, 8] as [number, number, number, number] });

    // Barra horizontal (canvas)
    const bar = (frac: number, color: string, w = 150) => ({
      canvas: [
        { type: 'rect', x: 0, y: 0, w, h: 6, r: 3, color: '#ececec' },
        { type: 'rect', x: 0, y: 0, w: Math.max(2, w * Math.max(0, Math.min(1, frac))), h: 6, r: 3, color },
      ],
    });

    // Tabela simples reaproveitando estilos
    const tabela = (head: string[], rows: string[][], widths: any[]) => ({
      table: {
        headerRows: 1, widths,
        body: [
          head.map((h, i) => ({ text: h, style: 'tableHeader', alignment: i === 0 ? 'left' : 'right' })),
          ...rows.map(r => r.map((c, i) => ({ text: c, style: 'tableCell', alignment: i === 0 ? 'left' : 'right' }))),
        ] as TableCell[][],
      },
      layout: this.tableLayout(),
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });

    const k = d.kpis;
    const content: any[] = [];

    // Cabeçalho
    content.push({ text: 'RAIO-X DA CAMPANHA', fontSize: 18, bold: true, color: COR.primary });
    content.push({ text: 'Cenário de projeção com o trabalho atual · Milton Vieira 2026', fontSize: 9, color: '#86868b', margin: [0, 1, 0, 10] as [number, number, number, number] });

    // Saúde
    content.push({
      columns: [
        {
          width: 130,
          table: { widths: ['*'], body: [[{
            fillColor: corSaude + '22', border: [false, false, false, false], margin: [10, 8, 10, 8] as [number, number, number, number],
            stack: [
              { text: 'ÍNDICE DE SAÚDE', fontSize: 7.5, color: '#86868b' },
              { text: `${d.saude.score}`, fontSize: 30, bold: true, color: corSaude },
              { text: d.saude.nivel === 'verde' ? 'Saudável' : d.saude.nivel === 'amarelo' ? 'Atenção' : 'Crítico', fontSize: 10, bold: true, color: corSaude },
            ],
          }]] },
          layout: 'noBorders',
        },
        {
          width: '*', margin: [12, 0, 0, 0] as [number, number, number, number],
          stack: d.saude.componentes.map((c: any) => ({
            margin: [0, 0, 0, 4] as [number, number, number, number],
            columns: [
              { width: 200, text: `${c.nome} (peso ${c.peso})`, fontSize: 8, color: '#1d1d1f' },
              { width: 'auto', stack: [bar(c.valor / 100, COR.primary)] },
              { width: 28, text: `${c.valor}%`, fontSize: 8, color: '#86868b', alignment: 'right' },
            ],
            columnGap: 6,
          })),
        },
      ],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });

    content.push({
      text: 'Como é calculado: média ponderada dos 5 fatores (pesos somam 100); cada fator (0–100%) × seu peso. Faixas: ≥70 saudável · 50–69 atenção · <50 crítico. Diversificação = 1 − concentração das 10 maiores cidades; Mix = 1 − % da base Externo; Crescimento = projeção vs 2022 (teto em +40%).',
      fontSize: 7, color: '#86868b', italics: true, margin: [0, 0, 0, 12] as [number, number, number, number],
    });

    // KPIs em cards (2 linhas de 3)
    content.push(cardRow([
      card('Projeção 2026 (cenário atual)', num(k.projecao_total), COR.primary, `${k.variacao_vs_2022 >= 0 ? '+' : ''}${pct(k.variacao_vs_2022)} vs 2022`),
      card('Votos 2022 (referência)', num(k.votos_2022), undefined, 'Base histórica — não somada'),
      card('Cobertura de municípios', `${k.municipios_cadastro}/${k.total_sp}`, undefined, pct(k.cobertura_pct)),
    ]));
    content.push(cardRow([
      card('Municípios com liderança', num(k.municipios_com_lideranca)),
      card('Lideranças · Coordenadores', `${num(k.lideres)} · ${num(k.coordenadores)}`),
      card('Zonas brancas (sem cadastro)', num(k.zonas_brancas), COR.vermelho),
    ]));

    // SWOT 2x2
    content.push({ text: 'Análise SWOT', fontSize: 13, bold: true, color: '#1d1d1f', margin: [0, 8, 0, 6] as [number, number, number, number] });
    const swotCell = (titulo: string, itens: string[], cor: string, fill: string) => ({
      fillColor: fill, border: [false, false, false, false], margin: [10, 8, 10, 8] as [number, number, number, number],
      stack: [
        { text: titulo, fontSize: 11, bold: true, color: cor, margin: [0, 0, 0, 4] as [number, number, number, number] },
        ...itens.map((it: string) => ({ text: `• ${limpar(it)}`, fontSize: 8, color: '#3a3a3c', margin: [0, 0, 0, 2] as [number, number, number, number] })),
      ],
    });
    content.push({
      table: { widths: ['*', '*'], body: [
        [swotCell('Forças', d.swot.forcas, '#1d7a44', '#eaf9ef'), swotCell('Fraquezas', d.swot.fraquezas, '#c0392b', '#ffeceb')],
        [swotCell('Oportunidades', d.swot.oportunidades, '#0066cc', '#eef5ff'), swotCell('Ameaças', d.swot.ameacas, '#b8860b', '#fff4e6')],
      ] },
      layout: { hLineWidth: () => 3, vLineWidth: () => 3, hLineColor: () => '#ffffff', vLineColor: () => '#ffffff' },
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });

    // Funil
    content.push({ text: 'Funil de Cobertura Territorial', style: 'sectionTitle' });
    const base = d.funil[0]?.valor || 1;
    content.push({
      stack: d.funil.map((f: any) => ({
        margin: [0, 0, 0, 4] as [number, number, number, number],
        columns: [
          { width: 110, text: f.etapa, fontSize: 8, color: '#1d1d1f' },
          { width: 'auto', stack: [bar(f.valor / base, COR.primary, 200)] },
          { width: 50, text: num(f.valor), fontSize: 8, bold: true, alignment: 'right' },
        ], columnGap: 6,
      })),
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });

    // Mix por base
    content.push({ text: 'Mix por Tipo de Base', style: 'sectionTitle' });
    content.push(tabela(['Tipo de base', 'Projeção', '% do total'],
      d.mix.map((m: any) => [m.label, num(m.projecao), pct(m.pct)]), ['*', 'auto', 'auto']));

    // Concentração (cards)
    content.push({ text: 'Concentração / Risco', style: 'sectionTitle' });
    content.push(cardRow([
      card('Top 10 cidades', pct(d.concentracao.pareto_top10), d.concentracao.pareto_top10 > 0.6 ? COR.vermelho : undefined),
      card('Top 20 cidades', pct(d.concentracao.pareto_top20)),
      card('Dependência maior coord.', pct(d.concentracao.dep_maior_coordenador), d.concentracao.dep_maior_coordenador > 0.25 ? COR.vermelho : undefined),
    ]));

    // Território (por bloco)
    content.push({ text: 'PROJEÇÕES', style: 'sectionTitle' });
    content.push(tabela(['Bloco', 'Municípios', 'Projeção'],
      d.territorio.map((t: any) => [t.divisao, num(t.municipios), num(t.projecao)]), ['*', 'auto', 'auto']));

    // Oportunidades
    content.push({ text: 'Maiores Oportunidades', style: 'sectionTitle' });
    content.push(tabela(['Município', 'Eleitores', 'Votos 22', 'Projeção'],
      d.oportunidades.map((o: any) => [o.nome, num(o.eleitores), num(o.votos22), num(o.projecao)]), ['*', 'auto', 'auto', 'auto']));

    // Coordenadores
    content.push({ text: 'Produtividade dos Coordenadores', style: 'sectionTitle' });
    content.push(tabela(['Coordenador', 'Municípios', 'Projeção'],
      d.coordenadores.map((c: any) => [c.nome, num(c.municipios), num(c.projecao)]), ['*', 'auto', 'auto']));

    return this.generatePdf({
      content, styles: this.getStyles(),
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      pageSize: 'A4', pageMargins: [36, 36, 36, 48],
      footer: this.pdfFooter(),
    });
  }

  private timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // ════════════════════════════════════════════════════════════════════════
  // EXPORTAÇÃO — Excel (.xlsx) e PDF a partir de "Tabela" neutra
  // ════════════════════════════════════════════════════════════════════════

  private async toExcel(titulo: string, tabelas: ExportTabela[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SHIFTWORKS TECNOLOGIA E MARKETING DO BRASIL';
    const ts = this.timestamp();
    const usados = new Set<string>();
    tabelas.forEach((tab, idx) => {
      // Nome de worksheet do Excel: sem * ? : \ / [ ], máx. 31 chars, e ÚNICO
      let safeName = ((tab.nome || `Aba ${idx + 1}`).replace(/[*?:\\/\[\]]/g, ' ').trim().slice(0, 31)) || `Aba ${idx + 1}`;
      if (usados.has(safeName.toLowerCase())) {
        let n = 2;
        let cand = `${safeName.slice(0, 27)} (${n})`;
        while (usados.has(cand.toLowerCase())) { n++; cand = `${safeName.slice(0, 27)} (${n})`; }
        safeName = cand;
      }
      usados.add(safeName.toLowerCase());
      const ws = wb.addWorksheet(safeName);
      ws.headerFooter = { oddFooter: '&LSHIFTWORKS TECNOLOGIA E MARKETING DO BRASIL&CRelatório gerado em: ' + ts + '&R&P/&N' };
      const ncols = Math.max(1, tab.colunas.length);
      ws.mergeCells(1, 1, 1, ncols);
      const tcell = ws.getCell(1, 1);
      tcell.value = `${titulo}${tab.nome ? ' — ' + tab.nome : ''}`;
      tcell.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
      let row = 3;
      for (const r of (tab.resumo || [])) {
        ws.getCell(row, 1).value = r.label; ws.getCell(row, 1).font = { bold: true };
        ws.getCell(row, 2).value = r.value as any;
        row++;
      }
      if ((tab.resumo || []).length) row++;
      const headerRow = ws.getRow(row);
      tab.colunas.forEach((c, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = c.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
      });
      row++;
      for (const lin of tab.linhas) {
        const r = ws.getRow(row);
        tab.colunas.forEach((c, i) => { r.getCell(i + 1).value = (lin[c.key] ?? '') as any; });
        row++;
      }
      tab.colunas.forEach((c, i) => { ws.getColumn(i + 1).width = c.width || 18; });
    });
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  private toPdf(titulo: string, tabelas: ExportTabela[]): Promise<Buffer> {
    const content: Content[] = [...this.buildHeader(titulo)];
    tabelas.forEach((tab, idx) => {
      if (tab.nome) content.push({ text: tab.nome, style: 'sectionTitle' } as Content);
      if (tab.resumo?.length) {
        content.push({
          columns: tab.resumo.map(r => ({ stack: [{ text: r.label, style: 'statLabel' }, { text: String(r.value), style: 'statValue', fontSize: 12 }], width: 'auto' })),
          columnGap: 24, margin: [0, 0, 0, 12] as [number, number, number, number],
        });
      }
      if (tab.colunas.length && tab.linhas.length) {
        const last = tab.colunas.length - 1;
        content.push({
          table: {
            headerRows: 1,
            widths: tab.colunas.map(c => c.width ? c.width : (c.key === 'nome' || c.key === 'lideranca' ? '*' : 'auto')),
            body: [
              tab.colunas.map((c, i) => ({ text: c.header, style: 'tableHeader', alignment: c.numero || i === last ? 'right' : 'left' })),
              ...tab.linhas.map(lin => tab.colunas.map((c, i) => ({ text: this.cellText(lin[c.key], c.numero), style: 'tableCell', alignment: c.numero || i === last ? 'right' : 'left' }))),
            ] as TableCell[][],
          },
          layout: this.tableLayout(),
          margin: [0, 0, 0, idx < tabelas.length - 1 ? 10 : 0] as [number, number, number, number],
        });
      }
    });
    const ts = this.timestamp();
    return this.generatePdf({
      content, styles: this.getStyles(),
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      pageSize: 'A4', pageMargins: [36, 40, 36, 48],
      footer: (currentPage: number, pageCount: number) => ({
        margin: [36, 8, 36, 0] as [number, number, number, number],
        columns: [
          { text: 'SHIFTWORKS TECNOLOGIA E MARKETING DO BRASIL', fontSize: 7, color: '#999999' },
          { text: `Relatório gerado em: ${ts}`, fontSize: 7, color: '#999999', alignment: 'center' },
          { text: `${currentPage}/${pageCount}`, fontSize: 7, color: '#999999', alignment: 'right' },
        ],
      }),
    });
  }

  private cellText(v: any, numero?: boolean): string {
    if (v === null || v === undefined || v === '') return numero ? '0' : '—';
    if (numero && typeof v === 'number') return this.formatNumber(v);
    return String(v);
  }

  // Monta as tabelas neutras por seção (reaproveitadas em Excel e PDF)
  private async montarTabelas(secao: string, params: { nome?: string; valor?: string; termo?: string; bloco?: string; tipo?: string }): Promise<{ titulo: string; arquivo: string; tabelas: ExportTabela[] }> {
    const fmtTipo = (t?: string | null) => TIPO_LABEL[this.normTipo(t)] || (t || '—');
    switch (secao) {
      case 'municipio': {
        const d: any = await this.dadosMunicipio(params.nome || '');
        if (!d.encontrado) throw new NotFoundException(`Município "${params.nome}" não encontrado`);
        const colunas: ExportColuna[] = [
          { header: 'Base', key: 'base' }, { header: 'Liderança', key: 'lideranca' }, { header: 'Cargo', key: 'cargo' },
          { header: 'Coordenação', key: 'coordenacao' }, { header: 'Projeção', key: 'projecao_total', numero: true },
        ];
        const linhas = d.registros.map((r: any) => ({ base: fmtTipo(r.tipo_cadastro), lideranca: r.lideranca || '—', cargo: r.funcao_cargo || '—', coordenacao: r.coordenacao || '—', projecao_total: r.projecao_total }));
        return {
          titulo: `Município — ${d.nome}`, arquivo: `municipio-${d.nome}`,
          tabelas: [{
            nome: d.nome,
            resumo: [
              { label: 'Votos 2022', value: this.formatNumber(d.dados_2022!.votos_22) },
              { label: 'Projeção 2026', value: this.formatNumber(d.totais!.projecao_total) },
              { label: 'Meta mínima', value: this.formatNumber(d.totais!.meta_minima) },
            ],
            colunas, linhas,
          }],
        };
      }
      case 'regiao': {
        const d: any = await this.dadosRegiao(params.valor || '');
        if (!d.encontrado) throw new NotFoundException(`Região/subdivisão "${params.valor}" não encontrada`);
        const colunas: ExportColuna[] = [
          { header: 'Município', key: 'nome' }, { header: 'Votos 22', key: 'votos_22', numero: true },
          { header: 'Eleitores 22', key: 'eleitores_22', numero: true }, { header: 'Projeção', key: 'projecao', numero: true },
        ];
        return {
          titulo: `${d.tipo} — ${d.valor}`, arquivo: `${d.tipo}-${d.valor}`,
          tabelas: [{
            nome: `${d.tipo}: ${d.valor}`,
            resumo: [
              { label: 'Municípios', value: this.formatNumber(d.totais!.municipios) },
              { label: 'Votos 2022', value: this.formatNumber(d.totais!.votos_22) },
              { label: 'Projeção 2026', value: this.formatNumber(d.totais!.projecao_total) },
            ],
            colunas, linhas: d.cidades!,
          }],
        };
      }
      case 'liderancas': {
        const d: any = await this.dadosLiderancas(params.termo || '');
        if (!d.encontrado) throw new NotFoundException(`Nenhuma liderança encontrada para "${params.termo}"`);
        const colunas: ExportColuna[] = [
          { header: 'Município', key: 'nome' }, { header: 'Votos 22', key: 'votos_22', numero: true },
          { header: 'Projeção', key: 'projecao', numero: true },
        ];
        return {
          titulo: `Lideranças — ${d.termo}`, arquivo: `liderancas-${d.termo}`,
          tabelas: [{
            nome: `Lideranças: ${d.termo}`,
            resumo: [
              { label: 'Municípios', value: this.formatNumber(d.totais!.municipios) },
              { label: 'Projeção 2026', value: this.formatNumber(d.totais!.projecao_total) },
            ],
            colunas, linhas: d.cidades,
          }],
        };
      }
      case 'bloco': {
        const d: any = await this.dadosBloco(params.bloco || '');
        if (!d.encontrado) throw new NotFoundException(`Bloco "${params.bloco}" sem Base Instituição`);
        const colunas: ExportColuna[] = [
          { header: 'Município', key: 'nome' }, { header: 'Liderança', key: 'lideranca' },
          { header: 'Cargo', key: 'funcao_cargo' }, { header: 'Projeção', key: 'projecao_votos', numero: true },
        ];
        const linhas = d.registros.map((r: any) => ({ nome: r.nome, lideranca: r.lideranca || '—', funcao_cargo: r.funcao_cargo || '—', projecao_votos: r.projecao_votos }));
        return {
          titulo: `Bloco — ${d.bloco} (Base Instituição)`, arquivo: `bloco-${d.bloco}`,
          tabelas: [{
            nome: `Bloco: ${d.bloco}`,
            resumo: [
              { label: 'Municípios', value: this.formatNumber(d.totais!.municipios) },
              { label: 'Registros', value: this.formatNumber(d.totais!.registros) },
              { label: 'Projeção', value: this.formatNumber(d.totais!.projecao_total) },
            ],
            colunas, linhas,
          }],
        };
      }
      case 'bases': {
        const colunas: ExportColuna[] = [
          { header: 'Bloco', key: 'bloco' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true },
        ];
        if (params.tipo) {
          const d: any = await this.dadosBases(params.tipo);
          return {
            titulo: `Bases de Apoio — ${d.label}`, arquivo: `bases-${d.label}`,
            tabelas: [{ nome: d.label, resumo: [{ label: 'Total projetado', value: this.formatNumber(d.total) }], colunas, linhas: d.blocos }],
          };
        }
        const d: any = await this.dadosBases();
        return {
          titulo: 'Bases de Apoio — Projeção por Bloco', arquivo: 'bases-de-apoio',
          tabelas: d.tipos.map((t: any) => ({ nome: t.label, resumo: [{ label: 'Total projetado', value: this.formatNumber(t.total) }], colunas, linhas: t.blocos })),
        };
      }
      default:
        throw new NotFoundException(`Seção de relatório desconhecida: ${secao}`);
    }
  }

  async exportar(secao: string, formato: string, params: { nome?: string; valor?: string; termo?: string; bloco?: string; tipo?: string }): Promise<{ buffer: Buffer; arquivo: string; mime: string }> {
    const { titulo, arquivo, tabelas } = await this.montarTabelas(secao, params);
    const safe = (arquivo || secao).replace(/[^a-zA-Z0-9]/g, '_');
    if (formato === 'xlsx' || formato === 'excel') {
      return { buffer: await this.toExcel(titulo, tabelas), arquivo: `${safe}.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return { buffer: await this.toPdf(titulo, tabelas), arquivo: `${safe}.pdf`, mime: 'application/pdf' };
  }

  // Export completo do RAIO-X (PDF executivo / planilha)
  async raioXExport(formato: string): Promise<{ buffer: Buffer; arquivo: string; mime: string }> {
    const d = await this.raioX();
    const pctTxt = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
    const limpar = (s: string) => s.replace(/\*/g, '');
    const tabelas: ExportTabela[] = [];

    tabelas.push({
      nome: 'KPIs',
      resumo: [
        { label: 'Índice de Saúde', value: `${d.saude.score}/100 (${d.saude.nivel})` },
        { label: 'Projeção 2026', value: this.formatNumber(d.kpis.projecao_total) },
        { label: 'Votos 2022 (ref.)', value: this.formatNumber(d.kpis.votos_2022) },
      ],
      colunas: [{ header: 'Indicador', key: 'k' }, { header: 'Valor', key: 'v' }],
      linhas: [
        { k: 'Projeção 2026 (trabalho atual)', v: this.formatNumber(d.kpis.projecao_total) },
        { k: 'Votos 2022 (referência histórica)', v: this.formatNumber(d.kpis.votos_2022) },
        { k: 'Variação projeção vs 2022', v: pctTxt(d.kpis.variacao_vs_2022) },
        { k: 'Cobertura de municípios', v: `${d.kpis.municipios_cadastro}/${d.kpis.total_sp} (${pctTxt(d.kpis.cobertura_pct)})` },
        { k: 'Municípios com liderança', v: this.formatNumber(d.kpis.municipios_com_lideranca) },
        { k: 'Municípios com projeção', v: this.formatNumber(d.kpis.municipios_com_projecao) },
        { k: 'Zonas brancas (sem cadastro)', v: this.formatNumber(d.kpis.zonas_brancas) },
        { k: 'Lideranças mobilizadas', v: this.formatNumber(d.kpis.lideres) },
        { k: 'Coordenadores', v: this.formatNumber(d.kpis.coordenadores) },
        { k: 'Concentração Top 10 cidades', v: pctTxt(d.concentracao.pareto_top10) },
        { k: 'Concentração Top 20 cidades', v: pctTxt(d.concentracao.pareto_top20) },
      ],
    });
    tabelas.push({ nome: 'Funil de Cobertura', colunas: [{ header: 'Etapa', key: 'etapa' }, { header: 'Municípios', key: 'valor', numero: true }], linhas: d.funil });
    tabelas.push({ nome: 'Mix por Base', colunas: [{ header: 'Tipo de base', key: 'label' }, { header: 'Projeção', key: 'projecao', numero: true }, { header: '% do total', key: 'pctTxt' }], linhas: d.mix.map(m => ({ label: m.label, projecao: m.projecao, pctTxt: pctTxt(m.pct) })) });
    tabelas.push({ nome: 'Território', colunas: [{ header: 'Divisão Regional', key: 'divisao' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.territorio });
    tabelas.push({ nome: 'Top Cidades', colunas: [{ header: 'Município', key: 'nome' }, { header: 'Votos 22', key: 'votos22', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.top_cidades });
    tabelas.push({ nome: 'Oportunidades', colunas: [{ header: 'Município', key: 'nome' }, { header: 'Eleitores', key: 'eleitores', numero: true }, { header: 'Votos 22', key: 'votos22', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.oportunidades });
    tabelas.push({ nome: 'Coordenadores', colunas: [{ header: 'Coordenador', key: 'nome' }, { header: 'Municípios', key: 'municipios', numero: true }, { header: 'Projeção', key: 'projecao', numero: true }], linhas: d.coordenadores });
    const swotTab = (nome: string, arr: string[]): ExportTabela => ({ nome, colunas: [{ header: nome, key: 'p' }], linhas: arr.map(p => ({ p: limpar(p) })) });
    tabelas.push(swotTab('Forças', d.swot.forcas));
    tabelas.push(swotTab('Fraquezas', d.swot.fraquezas));
    tabelas.push(swotTab('Oportunidades', d.swot.oportunidades));
    tabelas.push(swotTab('Ameaças', d.swot.ameacas));

    const titulo = 'RAIO-X DA CAMPANHA — Milton Vieira 2026';
    if (formato === 'xlsx' || formato === 'excel') {
      return { buffer: await this.toExcel(titulo, tabelas), arquivo: 'raio-x-campanha.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    // PDF executivo com cards + semáforo + SWOT (espelha o layout da tela)
    return { buffer: await this.raioXPdf(d), arquivo: 'raio-x-campanha.pdf', mime: 'application/pdf' };
  }
}

// Representação neutra de tabela usada para Excel e PDF
type ExportColuna = { header: string; key: string; width?: number; numero?: boolean };
type ExportTabela = { nome?: string; resumo?: Array<{ label: string; value: string | number }>; colunas: ExportColuna[]; linhas: any[] };
