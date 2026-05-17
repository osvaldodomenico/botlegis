import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MUNICIPIO_SELECT, MunicipioData, SearchResult } from '../bot.types';

@Injectable()
export class BotSearchService {
  constructor(private prisma: PrismaService) {}

  private municipios() {
    return (this.prisma as any).municipio;
  }

  // ── Text normalization ────────────────────────────────────────────────────

  normalizarNome(s: string): string {
    return s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private readonly STOPWORDS = new Set([
    'QUANTOS','VOTOS','PROMETEU','NOSSA','BASE','QUAL','QUEM','SAO','DOS','DAS',
    'PARA','COM','NAO','TEM','NOSSA','NOSSO','ESTA','ESTAO','COMO','ESTA','FOI',
    'TEMOS','BLOCO','REGIAO','MICRO','ZONA','AREA','PARTE','TODA','TODO','QUAL',
    'ESSE','ESSA','ESTE','ESTA','QUAIS','ONDE','QUANDO','PORQUE','CIDADES','CIDADE',
    'MUNICIPIO','MUNICIPIOS','LIDERANCA','COORDENADOR','CANDIDATO','APOIADOR',
  ]);

  extrairNomesProprios(texto: string): string[] {
    const norm = this.normalizarNome(texto);
    return norm.split(/\s+/).filter(p => p.length > 3 && !this.STOPWORDS.has(p));
  }

  // ── 1. Busca por município (fuzzy) ────────────────────────────────────────

  async buscarMunicipio(texto: string): Promise<MunicipioData | null> {
    const candidatos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
    });

    const textoNorm = this.normalizarNome(texto);
    const palavras = textoNorm.split(/\s+/).filter(p => p.length > 2);

    let melhor: MunicipioData | null = null;
    let melhorScore = 0;

    for (const m of candidatos) {
      const nomeNorm = this.normalizarNome(m.nome);
      if (nomeNorm === textoNorm) return m; // exact match
      const score = palavras.filter(p => nomeNorm.includes(p)).length;
      if (score > melhorScore) {
        melhorScore = score;
        melhor = m;
      }
    }

    return melhorScore >= 1 ? melhor : null;
  }

  // ── 2. Busca regional (mesorregião / região) ──────────────────────────────

  private readonly REGIOES_MAP: Record<string, { campo: 'mesorregiao' | 'regiao'; valor: string }> = {
    'VALE DO PARAIBA': { campo: 'mesorregiao', valor: 'VALE DO PARAIBA' },
    'VALE HISTORICO': { campo: 'mesorregiao', valor: 'VALE DO PARAIBA' },
    'VALE': { campo: 'mesorregiao', valor: 'VALE DO PARAIBA' },
    'SAO JOSE DO RIO PRETO': { campo: 'mesorregiao', valor: 'SÃO JOSÉ DO RIO PRETO' },
    'RIBEIRAO PRETO': { campo: 'mesorregiao', valor: 'RIBEIRÃO PRETO' },
    'CAMPINAS': { campo: 'mesorregiao', valor: 'CAMPINAS' },
    'BAURU': { campo: 'mesorregiao', valor: 'BAURU' },
    'PRESIDENTE PRUDENTE': { campo: 'mesorregiao', valor: 'PRESIDENTE PRUDENTE' },
    'ARACATUBA': { campo: 'mesorregiao', valor: 'ARAÇATUBA' },
    'MARILIA': { campo: 'mesorregiao', valor: 'MARILIA' },
    'PIRACICABA': { campo: 'mesorregiao', valor: 'PIRACICABA' },
    'ITAPETININGA': { campo: 'mesorregiao', valor: 'ITAPETININGA' },
    'ASSIS': { campo: 'mesorregiao', valor: 'ASSIS' },
    'ARARAQUARA': { campo: 'mesorregiao', valor: 'ARARAQUARA' },
    'LITORAL SUL': { campo: 'mesorregiao', valor: 'LITORAL SUL' },
    'METROPOLITANA': { campo: 'mesorregiao', valor: 'METROPOLITANA SP' },
    'MACRO METROPOLITANA': { campo: 'mesorregiao', valor: 'MACRO METROPOLITANA' },
  };

  detectarRegiao(texto: string): { campo: 'mesorregiao' | 'regiao'; valor: string } | null {
    const norm = this.normalizarNome(texto);
    for (const [chave, cfg] of Object.entries(this.REGIOES_MAP)) {
      if (norm.includes(chave)) return cfg;
    }
    return null;
  }

  async buscarMunicipiosPorRegiao(campo: 'mesorregiao' | 'regiao', valor: string): Promise<MunicipioData[]> {
    return this.municipios().findMany({
      where: { uf: 'SP', [campo]: valor },
      select: MUNICIPIO_SELECT,
      orderBy: { eleitores_22: 'desc' },
    });
  }

  // ── 3. Busca por nome de liderança/coordenador ────────────────────────────

  async buscarPorLideranca(texto: string): Promise<MunicipioData[]> {
    const palavras = this.extrairNomesProprios(texto);
    if (palavras.length === 0) return [];

    const todos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
    });

    return todos.filter(m => {
      const campos = [m.lideranca, m.coordenacao, m.coord_lideranca_2]
        .filter(Boolean)
        .map((c: string) => this.normalizarNome(c));
      return palavras.some(p => campos.some((c: string) => c.includes(p)));
    });
  }

  // ── 4. Busca por subdivisão geográfica ────────────────────────────────────

  async buscarPorSubdivisao(texto: string): Promise<{ tipo: string; valor: string; cidades: MunicipioData[] } | null> {
    const norm = this.normalizarNome(texto);
    const palavras = norm.split(/\s+/).filter(p => p.length > 3 && !this.STOPWORDS.has(p));
    if (palavras.length === 0) return null;

    const campos: Array<{ campo: string; label: string }> = [
      { campo: 'bloco', label: 'Bloco' },
      { campo: 'rm_ra', label: 'RM/RA' },
      { campo: 'divisao_regional', label: 'Divisão Regional' },
      { campo: 'microrregiao', label: 'Microrregião' },
    ];

    const todos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
      orderBy: { eleitores_22: 'desc' },
    });

    for (const { campo, label } of campos) {
      const achados = todos.filter(m => {
        const val = (m as any)[campo];
        if (!val) return false;
        const valNorm = this.normalizarNome(val);
        return palavras.some(p => valNorm.includes(p));
      });
      if (achados.length > 0) {
        const valorEncontrado = (achados[0] as any)[campo] as string;
        return { tipo: label, valor: valorEncontrado, cidades: achados };
      }
    }
    return null;
  }

  // ── 5. Busca por função/cargo da liderança ────────────────────────────────

  async buscarPorFuncaoCargo(texto: string): Promise<MunicipioData[]> {
    const norm = this.normalizarNome(texto);
    const funcoes = ['PREFEITO','PREFEITA','VEREADOR','VEREADORA','PASTOR','SECRETARIO','SUPLENTE','VICE','EX PREFEITO','EX VEREADOR'];
    const funcaoDetectada = funcoes.find(f => norm.includes(f));
    if (!funcaoDetectada) return [];

    return this.municipios().findMany({
      where: {
        uf: 'SP',
        OR: [
          { funcao_cargo: { contains: funcaoDetectada } },
          { funcao_cargo_2: { contains: funcaoDetectada } },
        ],
      },
      select: MUNICIPIO_SELECT,
      orderBy: { eleitores_22: 'desc' },
    });
  }

  // ── Unified search chain ──────────────────────────────────────────────────
  // Runs all 5 searches in priority order and returns the first hit.
  // currentMunicipioId: skip if matched city is same as user's registered city.

  async searchContext(texto: string, currentMunicipioId?: bigint): Promise<SearchResult> {
    // 1. City search
    const municipio = await this.buscarMunicipio(texto);
    if (municipio && String(municipio.id) !== String(currentMunicipioId ?? '')) {
      return { type: 'municipio', municipio };
    }

    // 2. Region search
    const regiao = this.detectarRegiao(texto);
    if (regiao) {
      const cidades = await this.buscarMunicipiosPorRegiao(regiao.campo, regiao.valor);
      if (cidades.length > 0) {
        return { type: 'regiao', cidades, regiaoNome: regiao.valor, termoBusca: texto };
      }
    }

    // 3. Leadership search
    const porLider = await this.buscarPorLideranca(texto);
    if (porLider.length > 0) {
      return { type: 'lideranca', cidades: porLider, termoBusca: texto };
    }

    // 4. Geographic subdivision search
    const subdiv = await this.buscarPorSubdivisao(texto);
    if (subdiv) {
      return {
        type: 'subdivisao',
        cidades: subdiv.cidades,
        subdivisaoTipo: subdiv.tipo,
        subdivisaoValor: subdiv.valor,
        termoBusca: texto,
      };
    }

    // 5. Role/function search
    const porFuncao = await this.buscarPorFuncaoCargo(texto);
    if (porFuncao.length > 0) {
      return { type: 'funcao_cargo', cidades: porFuncao, termoBusca: texto };
    }

    return { type: 'none' };
  }
}
