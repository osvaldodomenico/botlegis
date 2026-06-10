import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MUNICIPIO_SELECT, MunicipioData, SearchResult, CoordenadorRegiao } from '../bot.types';

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
    'PARA','COM','NAO','TEM','NOSSO','ESTAO','COMO','FOI','QUE','MAIS',
    'TEMOS','REGIAO','REGIOES','MICRO','ZONA','AREA','PARTE','TODA','TODO',
    'ESSE','ESSA','ESTE','ESTA','QUAIS','ONDE','QUANDO','PORQUE','CIDADES','CIDADE',
    'MUNICIPIO','MUNICIPIOS','LIDERANCA','LIDERANCAS','COORDENADOR','COORDENADORES',
    'COORDENACAO','COORDENACOES','CANDIDATO','APOIADOR','APOIADORES',
    'FORTE','FRACO','MELHOR','PIOR','MAIOR','MENOR','MUITO','POUCO',
    'SOBRE','FALA','FALE','MOSTRA','LISTA','LISTAR','DIGA','PRECISA','PRECISAMOS',
    'TRABALHO','TRABALHAR','VOCE','PODE','GENTE','SERIA','DEVEMOS','TODOS','TODAS','NOSSOS','NOSSAS',
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

    // Check compound names first (e.g., "São Paulo", "São José dos Campos").
    // IMPORTANTE: testar da chave MAIS LONGA p/ a mais curta — senão "São José do
    // Rio Preto" casa na chave genérica "SAO JOSE" (→ S.J. dos Campos) antes da
    // chave específica e devolve a cidade errada.
    const compoundKeys = Object.keys(this.COMPOUND_NAMES).sort((a, b) => b.length - a.length);
    for (const key of compoundKeys) {
      if (textoNorm.includes(key)) {
        const found = candidatos.find(m => this.normalizarNome(m.nome) === this.COMPOUND_NAMES[key]);
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

  // ── 1a. Sugestões de municípios (para ambiguidade — retorna top N) ────────

  async buscarSugestoes(texto: string, limite = 5): Promise<MunicipioData[]> {
    const candidatos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
    });

    const textoNorm = this.normalizarNome(texto);
    const palavras = textoNorm.split(/\s+/).filter(p => p.length > 2 && !this.STOPWORDS.has(p));
    if (palavras.length === 0) return [];

    const scored: Array<{ m: MunicipioData; score: number }> = [];

    for (const m of candidatos) {
      const nomeNorm = this.normalizarNome(m.nome);

      // Full-word score
      let score = palavras.filter(p => nomeNorm.includes(p)).length;

      // Prefix fuzzy (4-char prefix for broader matching in suggestions)
      if (score === 0) {
        const nomeWords = nomeNorm.split(/\s+/);
        const prefixHit = palavras.some(p =>
          p.length >= 4 && nomeWords.some(nw => nw.length >= 4 && p.slice(0, 4) === nw.slice(0, 4)),
        );
        if (prefixHit) score = 0.4;
      }

      if (score > 0) scored.push({ m, score });
    }

    // Deduplicate by city name (multiple leaders = same city)
    const seen = new Set<string>();
    return scored
      .sort((a, b) => b.score - a.score)
      .filter(({ m }) => {
        if (seen.has(m.nome)) return false;
        seen.add(m.nome);
        return true;
      })
      .slice(0, limite)
      .map(({ m }) => m);
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
  // Match the user text against ALL distinct values of bloco, rm_ra, divisao_regional, microrregiao.
  // Uses direct substring matching (normalized) to avoid stopword/length filtering issues.

  async buscarPorSubdivisao(texto: string): Promise<{ tipo: string; valor: string; cidades: MunicipioData[] } | null> {
    const norm = this.normalizarNome(texto);

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

    // Build a map of all distinct values per field with their normalized forms
    const campoValores: Array<{ campo: string; label: string; valores: Array<{ raw: string; norm: string }> }> = [];
    for (const { campo, label } of campos) {
      const seen = new Set<string>();
      const valores: Array<{ raw: string; norm: string }> = [];
      for (const m of todos) {
        const val = (m as any)[campo];
        if (val && String(val).trim() && !seen.has(String(val).trim())) {
          seen.add(String(val).trim());
          valores.push({ raw: String(val).trim(), norm: this.normalizarNome(String(val).trim()) });
        }
      }
      campoValores.push({ campo, label, valores });
    }

    // Pass 1: exact substring match (most precise) — "ZONA SUL" found inside query text
    for (const { campo, label, valores } of campoValores) {
      // Sort by longest norm first so "ZONA SUL" beats "ZONA" if both are substrings
      const sorted = [...valores].sort((a, b) => b.norm.length - a.norm.length);
      for (const { raw, norm: dbNorm } of sorted) {
        if (dbNorm.length >= 3 && norm.includes(dbNorm)) {
          const achados = todos.filter(m => (m as any)[campo] === raw);
          if (achados.length > 0) {
            return { tipo: label, valor: raw, cidades: achados };
          }
        }
      }
    }

    // Pass 2: word-based fallback — single word >= 5 chars matches (e.g. "JUNDIAI" in query matches bloco "JUNDIAI")
    for (const { campo, label, valores } of campoValores) {
      for (const { raw, norm: dbNorm } of valores) {
        const words = dbNorm.split(/\s+/).filter(w => w.length >= 5);
        if (words.some(w => norm.includes(w))) {
          const achados = todos.filter(m => (m as any)[campo] === raw);
          if (achados.length > 0) {
            return { tipo: label, valor: raw, cidades: achados };
          }
        }
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

  // ── 5b. Coordinator listing (aggregation by region) ─────────────────────

  private isCoordenadorListaQuery(textoNorm: string): boolean {
    return (
      /\b(QUANTOS|QUAIS|LISTA|LISTAR|TODOS|TODAS|NOSSOS|NOSSAS)\b/.test(textoNorm) &&
      /\b(COORDENADOR|COORDENADORES|COORDENACAO|COORDENACOES|LIDERANCA|LIDERANCAS)\b/.test(textoNorm)
    );
  }

  async listarCoordenadoresPorRegiao(): Promise<CoordenadorRegiao[]> {
    const todos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
      orderBy: { bloco: 'asc' },
    });

    // Group coordinators/leaders by bloco (most granular grouping)
    const porRegiao = new Map<string, Map<string, { nome: string; cidade: string; funcao?: string; tipo?: string }>>();

    for (const m of todos) {
      const regiao = m.bloco || m.mesorregiao || 'SEM REGIÃO';

      if (!porRegiao.has(regiao)) porRegiao.set(regiao, new Map());
      const coordMap = porRegiao.get(regiao)!;

      // Add coordenacao
      if (m.coordenacao) {
        const key = this.normalizarNome(m.coordenacao);
        if (!coordMap.has(key)) {
          coordMap.set(key, {
            nome: m.coordenacao,
            cidade: m.nome,
            funcao: m.funcao_cargo || undefined,
            tipo: m.tipo_cadastro || undefined,
          });
        }
      }
      // Add lideranca
      if (m.lideranca) {
        const key = 'LID_' + this.normalizarNome(m.lideranca);
        if (!coordMap.has(key)) {
          coordMap.set(key, {
            nome: m.lideranca,
            cidade: m.nome,
            funcao: m.funcao_cargo || undefined,
            tipo: m.tipo_cadastro || undefined,
          });
        }
      }
      // Add lideranca 2
      if (m.coord_lideranca_2) {
        const key = 'LID2_' + this.normalizarNome(m.coord_lideranca_2);
        if (!coordMap.has(key)) {
          coordMap.set(key, {
            nome: m.coord_lideranca_2,
            cidade: m.nome,
            funcao: m.funcao_cargo_2 || undefined,
            tipo: m.tipo_cadastro || undefined,
          });
        }
      }
    }

    const resultado: CoordenadorRegiao[] = [];
    for (const [regiao, coordMap] of porRegiao) {
      if (coordMap.size === 0) continue;
      resultado.push({
        regiao,
        coordenadores: Array.from(coordMap.values()),
      });
    }

    // Sort by region name
    resultado.sort((a, b) => a.regiao.localeCompare(b.regiao));
    return resultado;
  }

  // ── 5c. Bases de apoio: blocos & projeção por bloco/tipo ─────────────────

  private normalizeTipo(tipo?: string | null): string {
    return (tipo || '').trim().toUpperCase();
  }

  /** Distinct bloco values (optionally restricted to rows of a given tipo_cadastro). */
  async listarBlocos(tipoCadastro?: string): Promise<string[]> {
    const rows: Array<{ bloco: string | null; tipo_cadastro: string | null }> =
      await this.municipios().findMany({
        where: { uf: 'SP' },
        select: { bloco: true, tipo_cadastro: true },
      });
    const tnorm = tipoCadastro ? this.normalizeTipo(tipoCadastro) : null;
    const set = new Set<string>();
    for (const r of rows) {
      if (tnorm && this.normalizeTipo(r.tipo_cadastro) !== tnorm) continue;
      const b = (r.bloco || '').trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  /** Projeção (projecao_votos) agregada por bloco para um tipo_cadastro, com total. */
  async projecaoPorBlocoTipo(
    tipoCadastro: string,
  ): Promise<{ blocos: Array<{ bloco: string; projecao: number; municipios: number }>; total: number }> {
    const rows: Array<{ bloco: string | null; tipo_cadastro: string | null; projecao_votos: number | null; nome: string }> =
      await this.municipios().findMany({
        where: { uf: 'SP' },
        select: { bloco: true, tipo_cadastro: true, projecao_votos: true, nome: true },
      });
    const tnorm = this.normalizeTipo(tipoCadastro);
    const map = new Map<string, { projecao: number; municipios: Set<string> }>();
    let total = 0;
    for (const r of rows) {
      if (this.normalizeTipo(r.tipo_cadastro) !== tnorm) continue;
      const proj = r.projecao_votos || 0;
      const bloco = (r.bloco || '').trim() || 'SEM BLOCO';
      if (!map.has(bloco)) map.set(bloco, { projecao: 0, municipios: new Set() });
      const e = map.get(bloco)!;
      e.projecao += proj;
      e.municipios.add((r.nome || '').toUpperCase());
      total += proj;
    }
    const blocos = [...map.entries()]
      .map(([bloco, v]) => ({ bloco, projecao: v.projecao, municipios: v.municipios.size }))
      .sort((a, b) => b.projecao - a.projecao);
    return { blocos, total };
  }

  /** Registros individuais de um tipo_cadastro dentro de um bloco (match exato ou fuzzy do nome do bloco). */
  async registrosPorBlocoTipo(bloco: string, tipoCadastro: string): Promise<MunicipioData[]> {
    const rows: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
      orderBy: { projecao_votos: 'desc' },
    });
    const tnorm = this.normalizeTipo(tipoCadastro);
    const bnorm = this.normalizarNome(bloco);
    return rows.filter(
      (m) =>
        this.normalizeTipo(m.tipo_cadastro) === tnorm &&
        this.normalizarNome(m.bloco || '') === bnorm,
    );
  }

  // ── 5d. Projeção global por tipo de base (resposta determinística) ───────

  /**
   * Projeção total agregada por tipo_cadastro.
   * Por município: projecao_votos + COALESCE(projecao_2,0) + COALESCE(projecao_apoio_iurd,0) + COALESCE(projecao_base,0).
   * Retorna { instituicao, apoiadores, externo, total }.
   */
  async projecaoGlobalPorTipo(): Promise<{ instituicao: number; apoiadores: number; externo: number; total: number }> {
    const rows: Array<{
      tipo_cadastro: string | null;
      projecao_votos: number | null;
      projecao_2: number | null;
      projecao_apoio_iurd: number | null;
      projecao_base: number | null;
    }> = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: {
        tipo_cadastro: true,
        projecao_votos: true,
        projecao_2: true,
        projecao_apoio_iurd: true,
        projecao_base: true,
      },
    });

    let instituicao = 0;
    let apoiadores = 0;
    let externo = 0;

    for (const r of rows) {
      const proj =
        (r.projecao_votos || 0) +
        (r.projecao_2 || 0) +
        (r.projecao_apoio_iurd || 0) +
        (r.projecao_base || 0);
      const t = this.normalizeTipo(r.tipo_cadastro);
      if (t === 'BASE - INSTITUIÇÃO') instituicao += proj;
      else if (t === 'BASE APOIADORES') apoiadores += proj;
      else if (t === 'EXTERNO') externo += proj;
    }

    return { instituicao, apoiadores, externo, total: instituicao + apoiadores + externo };
  }

  // ── 5e. Coordenadores por tipo de base (resposta determinística) ─────────

  /**
   * Contagem de registros com cargo de coordenador, por tipo_cadastro.
   * Conta se funcao_cargo / funcao_cargo_2 / candidato_cargo contém "coordenador" (case-insensitive).
   * Retorna { instituicao, apoiadores, externo, total }.
   */
  async coordenadoresPorTipo(): Promise<{ instituicao: number; apoiadores: number; externo: number; total: number }> {
    const rows: Array<{
      tipo_cadastro: string | null;
      funcao_cargo: string | null;
      funcao_cargo_2: string | null;
      candidato_cargo: string | null;
    }> = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: {
        tipo_cadastro: true,
        funcao_cargo: true,
        funcao_cargo_2: true,
        candidato_cargo: true,
      },
    });

    const isCoord = (...campos: Array<string | null>): boolean =>
      campos.some((c) => !!c && c.toLowerCase().includes('coordenador'));

    let instituicao = 0;
    let apoiadores = 0;
    let externo = 0;

    for (const r of rows) {
      if (!isCoord(r.funcao_cargo, r.funcao_cargo_2, r.candidato_cargo)) continue;
      const t = this.normalizeTipo(r.tipo_cadastro);
      if (t === 'BASE - INSTITUIÇÃO') instituicao += 1;
      else if (t === 'BASE APOIADORES') apoiadores += 1;
      else if (t === 'EXTERNO') externo += 1;
    }

    return { instituicao, apoiadores, externo, total: instituicao + apoiadores + externo };
  }

  // ── 5f. Lideranças de um município (agrupadas por cargo) ─────────────────

  /**
   * Acha o município e extrai todas as lideranças (líder 1, coord/líder 2, candidato),
   * agrupadas por cargo. Retorna null se o município não for encontrado.
   */
  async liderancasPorMunicipio(
    nomeMunicipio: string,
  ): Promise<{ municipio: string; grupos: Array<{ cargo: string; pessoas: Array<{ nome: string; projecao: number }> }> } | null> {
    const mun = await this.buscarMunicipio(nomeMunicipio);
    if (!mun) return null;

    const linhas = await this.buscarTodasLinhasMunicipio(mun.nome);

    const map = new Map<string, Array<{ nome: string; projecao: number }>>();
    const add = (nome?: string | null, cargo?: string | null, projecao?: number | null) => {
      const n = (nome || '').trim();
      if (!n) return;
      const c = (cargo || '').trim() || 'Liderança';
      if (!map.has(c)) map.set(c, []);
      const lista = map.get(c)!;
      const nNorm = this.normalizarNome(n);
      if (lista.some((p) => this.normalizarNome(p.nome) === nNorm)) return;
      lista.push({ nome: n, projecao: projecao || 0 });
    };

    for (const m of linhas) {
      const proj = m.projecao_votos || 0;
      add(m.lideranca, m.funcao_cargo, proj);
      add(m.coord_lideranca_2, m.funcao_cargo_2, proj);
      add(m.candidato_nome, m.candidato_cargo, proj);
    }

    const grupos = [...map.entries()].map(([cargo, pessoas]) => ({ cargo, pessoas }));
    return { municipio: mun.nome, grupos };
  }

  // ── 5g. Busca de liderança por nome (ficha) ──────────────────────────────

  /**
   * Procura lideranca / coord_lideranca_2 / candidato_nome contendo o nome (normalizado).
   * Retorna a lista de ocorrências (município, cargo, tipo, projeção, coordenação).
   */
  async buscarLideranca(
    nome: string,
  ): Promise<Array<{ nome: string; cargo: string; municipio: string; tipo: string; projecao: number; coordenacao: string }>> {
    const palavras = this.extrairNomesProprios(nome);
    if (palavras.length === 0) return [];

    const todos: MunicipioData[] = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: MUNICIPIO_SELECT,
      orderBy: { projecao_votos: 'desc' },
    });

    const resultados: Array<{ nome: string; cargo: string; municipio: string; tipo: string; projecao: number; coordenacao: string }> = [];
    const seen = new Set<string>();

    const tentar = (valor?: string | null, cargo?: string | null, m?: MunicipioData) => {
      const v = (valor || '').trim();
      if (!v || !m) return;
      const vNorm = this.normalizarNome(v);
      if (!palavras.some((p) => vNorm.includes(p))) return;
      const key = `${vNorm}|${this.normalizarNome(m.nome)}`;
      if (seen.has(key)) return;
      seen.add(key);
      resultados.push({
        nome: v,
        cargo: (cargo || '').trim() || 'Liderança',
        municipio: m.nome,
        tipo: m.tipo_cadastro || '',
        projecao: m.projecao_votos || 0,
        coordenacao: (m.coordenacao || '').trim(),
      });
    };

    for (const m of todos) {
      tentar(m.lideranca, m.funcao_cargo, m);
      tentar(m.coord_lideranca_2, m.funcao_cargo_2, m);
      tentar(m.candidato_nome, m.candidato_cargo, m);
    }

    return resultados.sort((a, b) => b.projecao - a.projecao);
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

    // 0. Coordinator listing query — "quantos coordenadores nas regiões temos?"
    if (this.isCoordenadorListaQuery(textoNorm)) {
      const lista = await this.listarCoordenadoresPorRegiao();
      if (lista.length > 0) {
        return { type: 'coordenadores_lista', coordenadoresLista: lista, termoBusca: texto };
      }
    }

    const isRegiaoQuery = /\bREGIAO\b|\bREGIOES\b|\bMESORREGIAO\b|\bMICRORREGIAO\b|\bCIDADES\b|\bMUNICIPIOS\b/.test(textoNorm);

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

    // If query explicitly mentions "liderança", prioritize leadership search before city
    const isLiderancaQuery = /\bLIDERANCA\b|\bLIDERANCAS\b|\bLIDER\b/.test(textoNorm);
    if (isLiderancaQuery) {
      const porLider = await this.buscarPorLideranca(texto);
      if (porLider.length > 0) {
        return { type: 'lideranca', cidades: porLider, termoBusca: texto };
      }
    }

    // If query mentions "bloco", "divisao", or "vale", prioritize subdivision search before city
    const isBlocoQuery = /\bBLOCO\b|\bDIVISAO\b|\bVALE\b|\bRM\b|\bRA\b/.test(textoNorm);
    if (isBlocoQuery) {
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
