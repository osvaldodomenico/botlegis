// ─── Shared Types & Constants for LegisBot Webhook Services ──────────────────

// ── Prisma select object reused across all search methods ─────────────────────

export const MUNICIPIO_SELECT = {
  id: true,
  nome: true,
  mesorregiao: true,
  rm_ra: true,
  divisao_regional: true,
  microrregiao: true,
  bloco: true,
  regiao: true,
  projecao_votos: true,
  projecao_base: true,
  projecao_2: true,
  projecao_apoio_iurd: true,
  lideranca: true,
  coordenacao: true,
  funcao_cargo: true,
  coord_lideranca_2: true,
  funcao_cargo_2: true,
  votos_22: true,
  eleitores_22: true,
  votos_validos_22: true,
  percentual_mv: true,
  ranking_mv: true,
  candidato_nome: true,
  candidato_cargo: true,
  tipo_cadastro: true,
} as const;

export type MunicipioData = {
  id: bigint;
  nome: string;
  mesorregiao: string | null;
  rm_ra: string | null;
  divisao_regional: string | null;
  microrregiao: string | null;
  bloco: string | null;
  regiao: string | null;
  projecao_votos: number | null;
  projecao_base: number | null;
  projecao_2: number | null;
  projecao_apoio_iurd: number | null;
  lideranca: string | null;
  coordenacao: string | null;
  funcao_cargo: string | null;
  coord_lideranca_2: string | null;
  funcao_cargo_2: string | null;
  votos_22: number | null;
  eleitores_22: number | null;
  votos_validos_22: number | null;
  percentual_mv: number | null;
  ranking_mv: number | null;
  candidato_nome: string | null;
  candidato_cargo: string | null;
  tipo_cadastro: string | null;
};

// ── Search result from BotSearchService.searchContext() ──────────────────────

export type SearchResultType =
  | 'municipio'
  | 'regiao'
  | 'subdivisao'
  | 'lideranca'
  | 'funcao_cargo'
  | 'ranking'
  | 'none';

export type SearchResult = {
  type: SearchResultType;
  municipio?: MunicipioData;
  cidades?: MunicipioData[];
  regiaoNome?: string;
  subdivisaoTipo?: string;
  subdivisaoValor?: string;
  termoBusca?: string;
  rankingCriterio?: string;
};

// ── Bot intent types (used by BotIntentService in Phase 2) ───────────────────

export type BotIntent =
  | 'SAUDACAO'
  | 'CONSULTA_CIDADE'
  | 'CONSULTA_REGIAO'
  | 'CONSULTA_LIDERANCA'
  | 'CONSULTA_CARGO'
  | 'CONSULTA_ESTRATEGIA'
  | 'CONSULTA_RANKING'
  | 'CONSULTA_PROJECAO'
  | 'CONSULTA_COMPARACAO'
  | 'CONSULTA_META'
  | 'CONSULTA_BLOCO'
  | 'CONSULTA_BASE'
  | 'DESPEDIDA'
  | 'FORA_ESCOPO'
  | 'DESCONHECIDO';

// ── Evolution webhook input/output types ─────────────────────────────────────

export type EvolutionWebhookInput = {
  body: any;
  headers: Record<string, any>;
  token?: string;
};

export type ParsedMessage = {
  messageId?: string;
  fromMe?: boolean;
  remoteJid?: string;
  number?: string;
  text?: string;
  audioUrl?: string;
};
