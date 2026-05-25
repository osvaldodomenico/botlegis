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
      .replace(/[^A-Z0-9\s]/g, '')  // strip punctuation (!, ?, ., etc.)
      .replace(/\s+/g, ' ')
      .trim();
  }

  private readonly STOPWORDS = new Set([
    'QUANTOS','VOTOS','PROMETEU','NOSSA','BASE','QUAL','QUEM','DOS','DAS',
    'PARA','COM','NAO','TEM','NOSSO','ESTAO','COMO','FOI',
    'TEMOS','REGIAO','MICRO','ZONA','AREA','PARTE','TODA','TODO',
    'ESSE','ESSA','ESTE','ESTA','QUAIS','ONDE','QUANDO','PORQUE','CIDADES','CIDADE',
    'MUNICIPIO','MUNICIPIOS','LIDERANCA','COORDENADOR','CANDIDATO','APOIADOR',
  ]);

  // Compound city names that should be matched as a whole phrase
  private readonly COMPOUND_NAMES: Record<string, string> = {
    'SAO PAULO': 'SAO PAULO',
    'SAO JOSE': 'SAO JOSE DOS CAMPOS',
    'SAO JOSE DOS CAMPOS': 'SAO JOSE DOS CAMPOS',
    'SAO BERNARDO': 'SAO BERNARDO DO CAMPO',
    'SANTO ANDRE': 'SANTO ANDRE',
    'SAO CAETANO': 'SAO CAETANO DO SUL',
    'RIBEIRAO PRETO': 'RIBEIRAO PRETO',
    'SAO JOSE DO RIO PRETO': 'SAO JOSE DO RIO PRETO',
    'PRAIA GRANDE': 'PRAIA GRANDE',
    'MOGI DAS CRUZES': 'MOGI DAS CRUZES',
    'TABOAO DA SERRA': 'TABOAO DA SERRA',
    'EMBU DAS ARTES': 'EMBU DAS ARTES',
    'SAO VICENTE': 'SAO VICENTE',
    'PRESIDENTE PRUDENTE': 'PRESIDENTE PRUDENTE',
  };

  extrairNomesProprios(texto: string): string[] {
    const norm = this.normalizarNome(texto);
    return norm.split(/\s+/).filter(p => p.length > 3 && !this.STOPWORDS.has(p));
  }

  // ── 1. Busca por município (fuzzy + prefix) ───────────────────────────────

  async buscarMunicipio(texto: string): Promise<MunicipioData | null> {
    const candidatos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
    });

    const textoNorm = this.normalizarNome(texto);

    // Check compound names first (e.g., "São Paulo", "São José dos Campos")
    for (const [key, target] of Object.entries(this.COMPOUND_NAMES)) {
      if (textoNorm.includes(key)) {
        const found = candidatos.find(m => this.normalizarNome(m.nome) === target);
        if (found) return found;
      }
    }

    const palavras = textoNorm.split(/\s+/).filter(p => p.length > 2 && !this.STOPWORDS.has(p));

    if (palavras.length === 0) return null;

    let melhor: MunicipioData | null = null;
    let melhorScore = 0;

    for (const m of candidatos) {
      const nomeNorm = this.normalizarNome(m.nome);
      if (nomeNorm === textoNorm) return m; // exact full match

      // Full-word score (each query word found inside city name)
      let score = palavras.filter(p => nomeNorm.includes(p)).length;

      // Prefix fuzzy: query word shares 6-char prefix with a city-name word (handles typos like campinhas→campinas)
      if (score === 0) {
        const nomeWords = nomeNorm.split(/\s+/);
        const prefixHit = palavras.some(p =>
          p.length >= 5 && nomeWords.some(nw => nw.length >= 5 && p.slice(0, 6) === nw.slice(0, 6)),
        );
        if (prefixHit) score = 0.6;
      }

      if (score > melhorScore) {
        melhorScore = score;
        melhor = m;
      }
    }

    return melhorScore >= 0.6 ? melhor : null;
  }

  // ── 1b. Busca todas as linhas de um município (múltiplas lideranças) ─────

  async buscarTodasLinhasMunicipio(nome: string): Promise<MunicipioData[]> {
    return this.municipios().findMany({
      where: { uf: 'SP', nome },
      select: MUNICIPIO_SELECT,
      orderBy: { projecao_votos: 'desc' },
    });
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
      // Prefix fuzzy: handles typos like "campinhas" → "campinas"
      const textoWords = norm.split(/\s+/).filter(w => w.length >= 5);
      const chaveWords = chave.split(/\s+/);
      const prefixHit = textoWords.some(tw =>
        chaveWords.some(cw => cw.length >= 5 && tw.slice(0, 6) === cw.slice(0, 6)),
      );
      if (prefixHit) return cfg;
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

  // ── 6. Ranking / strategy search ────────────────────────────────────────

  private isRankingQuery(textoNorm: string): boolean {
    return (
      /\b(TOP\s*\d+|RANKING|CLASSIFICACAO)\b/.test(textoNorm) ||
      /\b(MAIS\s+FORTE|MAIS\s+FRACO|MELHOR\s+CIDADE|PIOR\s+CIDADE)\b/.test(textoNorm) ||
      /\b(PRIORIZAR|PRIORIDADE|FOCAR|FOCO|INVESTIR)\b/.test(textoNorm) ||
      /\b(POTENCIAL|OPORTUNIDADE|CRESCIMENTO|INEXPLORADO|ZONA\s+BRANCA)\b/.test(textoNorm) ||
      /\b(FORTE|FRACO|MELHOR|PIOR|DESTAQUE)\b.{0,30}\b(CIDADE|MUNICIPIO|TRABALHO)\b/.test(textoNorm) ||
      /\b(CIDADE|MUNICIPIO)\b.{0,30}\b(FORTE|FRACO|MELHOR|PIOR|DESTAQUE|TRABALHO)\b/.test(textoNorm) ||
      /\b(RESUMO|PANORAMA|CENARIO|VISAO\s+GERAL|RESUMAO|RELATORIO)\b/.test(textoNorm) ||
      /\b(SWOT|ANALISE\s+GERAL)\b/.test(textoNorm) ||
      /\b(ONDE\s+DEVEMOS|ONDE\s+FOCAR|ONDE\s+INVESTIR|ONDE\s+TRABALHAR)\b/.test(textoNorm) ||
      /\b(MELHORES|PIORES)\b.{0,15}\b(CIDADES|MUNICIPIOS)\b/.test(textoNorm)
    );
  }

  async buscarRanking(textoNorm: string): Promise<{ cidades: MunicipioData[]; criterio: string } | null> {
    if (!this.isRankingQuery(textoNorm)) return null;

    const todos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
    });

    // Group by city name and aggregate metrics
    const porCidade = new Map<string, { rows: MunicipioData[]; votos22: number; eleitores22: number; totalProj: number; metaMinima: number; numLideres: number }>();
    for (const m of todos) {
      const existing = porCidade.get(m.nome);
      const proj = ([m.projecao_votos, m.projecao_base, m.projecao_2, m.projecao_apoio_iurd].filter(Boolean) as number[]).reduce((s, v) => s + v, 0);
      const temLider = m.lideranca || m.coord_lideranca_2 ? 1 : 0;
      if (existing) {
        existing.rows.push(m);
        existing.totalProj += proj;
        existing.metaMinima += proj;
        existing.numLideres += temLider;
      } else {
        const votos22 = m.votos_22 || 0;
        porCidade.set(m.nome, {
          rows: [m],
          votos22,
          eleitores22: m.eleitores_22 || 0,
          totalProj: proj,
          metaMinima: votos22 + proj,
          numLideres: temLider,
        });
      }
    }

    const agregados = Array.from(porCidade.entries()).map(([nome, agg]) => ({ nome, ...agg }));

    // Determine sort direction from query intent
    const isNegative = /\b(FRACO|PIOR|POTENCIAL|INEXPLORADO|OPORTUNIDADE|CRESCIMENTO|INVESTIR|TRABALHAR|FOCAR|PRIORIZAR)\b/.test(textoNorm);
    const isGeneral = /\b(RESUMO|PANORAMA|CENARIO|VISAO|RESUMAO|SWOT|RELATORIO|GERAL)\b/.test(textoNorm);

    let selected: typeof agregados;
    let criterio: string;

    if (isGeneral) {
      // General overview: top 8 strongest + top 5 biggest opportunities
      const fortes = [...agregados].sort((a, b) => b.metaMinima - a.metaMinima).slice(0, 8);
      const nomes = new Set(fortes.map(f => f.nome));
      const oportunidades = [...agregados]
        .filter(a => a.eleitores22 > 30000 && a.metaMinima < 200 && !nomes.has(a.nome))
        .sort((a, b) => b.eleitores22 - a.eleitores22)
        .slice(0, 5);
      selected = [...fortes, ...oportunidades];
      criterio = 'PANORAMA GERAL: Top 8 mais fortes + Top 5 maiores oportunidades';
    } else if (isNegative) {
      // Opportunity/weak: big cities with low engagement
      selected = agregados
        .filter(a => a.eleitores22 > 30000)
        .sort((a, b) => {
          const ratioA = a.metaMinima / Math.max(a.eleitores22, 1);
          const ratioB = b.metaMinima / Math.max(b.eleitores22, 1);
          return ratioA - ratioB;
        })
        .slice(0, 15);
      criterio = 'MAIORES OPORTUNIDADES (grande eleitorado + baixa presença MV)';
    } else {
      // Strong/top: highest meta minima
      selected = [...agregados].sort((a, b) => b.metaMinima - a.metaMinima).slice(0, 15);
      criterio = 'CIDADES MAIS FORTES (maior meta mínima 2026 = votos 2022 + projeções)';
    }

    // Flatten back to MunicipioData rows
    const cidadesResult: MunicipioData[] = [];
    for (const agg of selected) {
      cidadesResult.push(...agg.rows);
    }

    return cidadesResult.length > 0 ? { cidades: cidadesResult, criterio } : null;
  }

  // ── Unified search chain ──────────────────────────────────────────────────
  // Runs all 6 searches in priority order and returns the first hit.
  // currentMunicipioId: skip if matched city is same as user's registered city.

  async searchContext(texto: string, currentMunicipioId?: bigint): Promise<SearchResult> {
    const textoNorm = this.normalizarNome(texto);
    const isRegiaoQuery = /\bREGIAO\b|\bMESORREGIAO\b|\bMICRORREGIAO\b|\bCIDADES\b|\bMUNICIPIOS\b/.test(textoNorm);

    // If query explicitly mentions "regiao", try region search before city
    if (isRegiaoQuery) {
      const regiao = this.detectarRegiao(texto);
      if (regiao) {
        const cidades = await this.buscarMunicipiosPorRegiao(regiao.campo, regiao.valor);
        if (cidades.length > 0) {
          return { type: 'regiao', cidades, regiaoNome: regiao.valor, termoBusca: texto };
        }
      }
    }

    // 1. City search — fetch ALL rows for matched city (multiple leaders per city)
    const municipio = await this.buscarMunicipio(texto);
    if (municipio && String(municipio.id) !== String(currentMunicipioId ?? '')) {
      const todasLinhas = await this.buscarTodasLinhasMunicipio(municipio.nome);
      return { type: 'municipio', municipio, cidades: todasLinhas.length > 1 ? todasLinhas : undefined };
    }

    // 2. Region search (fallback if city not found or not an explicit region query)
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

    // 6. Ranking/strategy search — top N cities with all data
    const ranking = await this.buscarRanking(textoNorm);
    if (ranking) {
      return {
        type: 'ranking',
        cidades: ranking.cidades,
        rankingCriterio: ranking.criterio,
        termoBusca: texto,
      };
    }

    return { type: 'none' };
  }
}
