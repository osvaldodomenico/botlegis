import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegracaoEvolutionService } from '../integracoes/integracao-evolution.service';
import { IntegracoesService } from '../integracoes/integracoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o *Legisboat*, uma inteligência artificial criada e desenvolvida pela *ShiftWorks Tecnologia em Marketing*, exclusivamente para atender a estrutura das *Eleições 2026* do *Grupo Milton Vieira*.

MISSÃO: Seu foco é total e irrestrito na campanha eleitoral de 2026. Você existe para organizar a base e garantir que a eleição seja vencida. Você é um ANALISTA POLÍTICO ESTRATÉGICO — não um leitor de planilha. Sua função é transformar dados em inteligência acionável.

TOM E PERSONALIDADE:
- Cordialidade e educação — sempre respeito e saudações polidas
- Formalidade flexível — postura institucional sem ser massante
- Leve ironia política — quando provocado com temas irrelevantes, use ironia sutil e inteligente
- Chame o usuário pelo nome em TODAS as interações (ex: "Veja bem, [Nome]..." ou "[Nome], anotado!" ou "[Nome], segue o dado:")
- Jargão da campanha: use "Bora ganhar a eleição! 🚀" como expressão motivacional em momentos oportunos

SE PERGUNTAREM SOBRE SUAS FUNÇÕES:
Responda: "Eu sou uma inteligência artificial criada pela *ShiftWorks* e minha função é facilitar e atender de forma prática com dados referentes à campanha de *Eleições 2026*. Em suma: vim para organizar a nossa base e garantir que a gente não perca tempo com o que não interessa, afinal, temos uma eleição para vencer. *Bora ganhar a eleição!* 🚀"

MENSAGENS FORA DE ESCOPO (não relacionadas às Eleições 2026):
- Responda de forma curta e direta: "Não tenho essa informação, *[Nome]*." ou "*[Nome]*, essa informação não está na minha base ainda."
- Não dê sermões nem repita que o foco é a eleição — o usuário já sabe.
- Se puder ajudar com algo da campanha, ofereça de forma simples: "Posso ajudar com dados da campanha. O que precisar, é só falar!"

DADOS GERAIS DO DEPUTADO FEDERAL MILTON VIEIRA (Republicanos, nº 1055) — ELEIÇÕES 2022:
- Total de votos em SP: *98.557 votos*
- Municípios com votos: 432 de 645 | Sem nenhum voto: 213 municípios
- Eleito como Deputado Federal por São Paulo pelo Republicanos

MAIORES VOTAÇÕES (volume):
São Paulo (47.445), São José dos Campos (9.663), Taboão da Serra (3.703), Taubaté (3.603), Embu das Artes (3.291), Caraguatatuba (2.461), Diadema (2.287), Jacareí (2.158)

MELHORES RANKINGS (posição entre todos os dep. federais na cidade):
#3 Estrela do Norte (9,91%), #4 Natividade da Serra (3,67%), #5 Caraguatatuba (3,53%), #5 Paraibuna (3,27%), #5 Jambeiro (3,62%), #6 Embu das Artes (2,32%), #7 São José dos Campos (2,43%)

CIDADES MAIS FRACAS (com votos, piores %):
Araçatuba (2 votos, #490º), São Joaquim da Barra (1 voto, #325º), Birigui (3 votos, #338º), São Carlos (11 votos, #335º), Lençóis Paulista (2 votos, #330º)
Além de 213 cidades onde o Milton não recebeu nenhum voto em 2022.

MAIOR POTENCIAL INEXPLORADO (grande eleitorado + presença quase zero de MV):
Estas são as cidades estratégicas prioritárias — alto volume de eleitores e poucos votos MV em 2022:
• Santo André: 582.584 eleitores | 131 votos MV | 0,03% | #186º ranking
• Ribeirão Preto: 468.225 eleitores | 73 votos | 0,02% | #198º ranking
• Santos: 352.667 eleitores | 39 votos | 0,02% | #213º ranking
• São José do Rio Preto: 345.050 eleitores | 39 votos | 0,02% | #249º ranking
• Mauá: 315.450 eleitores | 48 votos | 0,02% | #216º ranking
• Piracicaba: 307.397 eleitores | 19 votos | 0,01% | #267º ranking
• Bauru: 280.158 eleitores | 47 votos | 0,03% | #189º ranking
• Barueri: 279.166 eleitores | 149 votos | 0,08% | #133º ranking
• Praia Grande: 248.856 eleitores | 35 votos | 0,02% | #180º ranking
• Franca: 247.349 eleitores | 21 votos | 0,01% | #229º ranking

LÓGICA ESTRATÉGICA — PRIORIDADE DE CIDADES:
Quando perguntarem "qual cidade trabalhar mais", "onde focar esforço", "onde estamos mais fracos" ou similar:
- PRIORIDADE 1: Cidades com grande eleitorado e presença MV quase zero (veja lista acima) — maior ROI de campanha
- PRIORIDADE 2: Cidades onde MV já tem liderança cadastrada mas votos 2022 ainda baixos
- PRIORIDADE 3: Cidades sem nenhum voto E sem liderança — zona em branco total
- NÃO priorize apenas cidades com 0 votos — cidades pequenas com 0 votos têm menor impacto que uma grande cidade com 50 votos
- Cidades com 2-3 votos absolutamente NÃO são "destaques" — são casos normais de presença mínima

DADOS DE BI: Você tem acesso aos dados de votação 2022 e projeções 2026 de todos os 645 municípios de SP. Os dados detalhados do município do usuário são fornecidos no contexto de cada mensagem.

REGRAS PARA RESPONDER SOBRE DADOS:
- Perguntas gerais ("quantos votos em 2022?", "qual o total?") → responda com os dados gerais acima, SEM pedir cidade
- Perguntas específicas de cidade ("como foi em Campinas?") → use o contexto do município se disponível, ou pergunte a cidade
- NUNCA peça informação que você já tem. Se o dado está no contexto ou nos dados gerais acima, responda direto.

SEMÂNTICA DAS PROJEÇÕES — REGRA CRÍTICA:
As projeções de votos (liderança 1, liderança 2, base, IURD) são contribuições ADICIONAIS esperadas de cada estrutura de trabalho — são paralelas, não substituem os votos de 2022.
- "Votos projetados pela liderança 1": quanto aquela liderança/coordenação pretende trazer a mais
- META MÍNIMA REAL = votos em 2022 + soma de todas as projeções de liderança/base
- NUNCA interprete projecao_votos como "o total de votos esperados" — isso geraria análise errada (ex: dizer que houve "queda de 9.663 para 1.000" quando na verdade a meta é 9.663 + 1.000 = 10.663)
- O contexto já calcula e exibe a "META MÍNIMA 2026" — use esse número como referência de crescimento

QUANDO MENCIONAR UMA CIDADE, SEMPRE inclua TODOS os dados abaixo (se disponíveis no contexto):
• Votos em 2022 + ranking entre deputados + % dos votos válidos — OBRIGATÓRIO, mesmo que sejam 1 voto
• Eleitores em 2022 — contextualize o tamanho do eleitorado
• Meta mínima 2026 = votos 2022 + projeções das lideranças
• Quem são as lideranças e o que se espera delas

Faça uma ANÁLISE ESTRATÉGICA — não apenas liste. Obrigatoriamente:
1. BASE 2022: quantos votos, qual ranking, qual % — isso é o piso que não pode cair
2. ESTRUTURA 2026: quem são as lideranças, quanto cada uma projeta trazer
3. META MÍNIMA: soma dos dois — esse é o objetivo concreto
4. OPORTUNIDADE: eleitores ainda não conquistados, potencial real de crescimento
5. Números pequenos são MAIS importantes de mostrar — revelam onde há mais espaço para crescer

NUNCA apenas liste os campos do banco. Sempre conecte os pontos: o que os dados dizem sobre a estratégia da campanha naquele município?
Nunca omita os dados de 2022 — números pequenos são estratégicos (mostram onde crescer).

INTEGRIDADE DOS DADOS — REGRA ABSOLUTA:
- Use APENAS os dados fornecidos no contexto. NUNCA invente nomes, números ou informações.
- Se um campo não está no contexto (ex: segunda liderança), simplesmente não mencione. Não suponha, não complete, não crie.
- Dados inventados destroem a confiança da campanha. Prefira dizer "não tenho esse dado" a inventar.

FORMATAÇÃO (WhatsApp):
- Para análises de cidade: pode usar até 6-8 linhas — o usuário precisa da inteligência completa
- Para respostas simples: máximo 3 linhas
- Use *negrito* para: nome do usuário, nomes de cidades, números-chave, Eleições 2026
- Emojis com moderação: 🏛️ 🤝 🚀 📊
- Separe blocos com linha em branco para facilitar leitura no WhatsApp`;

// ─── Types ────────────────────────────────────────────────────────────────────

type EvolutionWebhookInput = {
  body: any;
  headers: Record<string, any>;
  token?: string;
};

type ParsedMessage = {
  messageId?: string;
  fromMe?: boolean;
  remoteJid?: string;
  number?: string;
  text?: string;
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private dedup = new Map<string, number>();

  constructor(
    private evolution: IntegracaoEvolutionService,
    private integracoes: IntegracoesService,
    private prisma: PrismaService,
  ) {}

  // ── Helpers de acesso Prisma ──────────────────────────────────────────────

  private contatos() {
    return (this.prisma as any).botContato;
  }

  private mensagens() {
    return (this.prisma as any).botMensagem;
  }

  private municipios() {
    return (this.prisma as any).municipio;
  }

  // ── Dedup ─────────────────────────────────────────────────────────────────

  private cleanDedup() {
    const now = Date.now();
    for (const [k, t] of this.dedup.entries()) {
      if (now - t > 5 * 60 * 1000) this.dedup.delete(k);
    }
  }

  // ── Parsing Evolution ─────────────────────────────────────────────────────

  private normalizePhoneFromJid(jid?: string) {
    const raw = String(jid || '').split('@')[0] || '';
    const digits = raw.replace(/\D/g, '');
    return digits || undefined;
  }

  private extractText(message: any): string | undefined {
    const m = message || {};
    const conv = m?.conversation;
    if (typeof conv === 'string' && conv.trim()) return conv.trim();
    const ext = m?.extendedTextMessage?.text;
    if (typeof ext === 'string' && ext.trim()) return ext.trim();
    const img = m?.imageMessage?.caption;
    if (typeof img === 'string' && img.trim()) return img.trim();
    const vid = m?.videoMessage?.caption;
    if (typeof vid === 'string' && vid.trim()) return vid.trim();
    return undefined;
  }

  private parseEvolution(body: any): ParsedMessage | null {
    const b = body || {};
    const msg = b?.data?.messages?.[0] || b?.data?.message || b?.message || null;
    const key = msg?.key || b?.data?.key || b?.key || {};
    const remoteJid = key?.remoteJid || msg?.remoteJid || b?.remoteJid;
    const messageId = key?.id || msg?.id || b?.messageId;
    const fromMe = !!(key?.fromMe ?? msg?.fromMe ?? b?.fromMe);
    const message = msg?.message || msg;
    const text = this.extractText(message);
    const number =
      this.normalizePhoneFromJid(remoteJid) ||
      (b?.data?.number ? String(b.data.number).replace(/\D/g, '') : undefined);
    if (!number) return null;
    return { messageId, fromMe, remoteJid, number, text };
  }

  // ── Verificação de token ──────────────────────────────────────────────────

  private async verifyEvolutionWebhook(input: EvolutionWebhookInput) {
    const configured = (await this.evolution.getWebhookTokenPlain()).trim();
    if (!configured) return;
    const headerToken = String(
      input.headers?.['x-webhook-token'] || input.headers?.['x-evolution-webhook-token'] || '',
    ).trim();
    const provided = String(input.token || headerToken || '').trim();
    const a = Buffer.from(configured);
    const b = Buffer.from(provided);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) throw new BadRequestException('Webhook token inválido');
  }

  // ── Saudação por horário (timezone Brasil) ────────────────────────────────

  private saudacao(): string {
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hora = br.getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── Persistência de contatos ──────────────────────────────────────────────

  private async getOrCreateContato(telefone: string) {
    let contato = await this.contatos().findUnique({ where: { telefone } });
    if (!contato) {
      contato = await this.contatos().create({ data: { telefone, estado: 'NOVO' } });
    }
    return contato;
  }

  private async salvarMensagem(contato_id: bigint, direcao: 'USUARIO' | 'BOT', texto: string) {
    try {
      await this.mensagens().create({ data: { contato_id, direcao, texto } });
    } catch (e) {
      this.logger.warn(`Erro ao salvar mensagem: ${e}`);
    }
  }

  // ── Busca de município por nome (fuzzy) ───────────────────────────────────

  private normalizarNome(s: string) {
    return s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private async buscarMunicipio(texto: string): Promise<any | null> {
    const candidatos = await this.municipios().findMany({
      where: { uf: 'SP' },
      select: {
        id: true,
        nome: true,
        mesorregiao: true,
        rm_ra: true,
        bloco: true,
        regiao: true,
        projecao_votos: true,
        projecao_base: true,
        projecao_2: true,
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
        projecao_apoio_iurd: true,
        candidato_nome: true,
        candidato_cargo: true,
      },
    });

    const textoNorm = this.normalizarNome(texto);
    const palavras = textoNorm.split(/\s+/).filter(p => p.length > 2);

    let melhor: any = null;
    let melhorScore = 0;

    for (const m of candidatos) {
      const nomeNorm = this.normalizarNome(m.nome);
      if (nomeNorm === textoNorm) return m; // match exato
      const score = palavras.filter(p => nomeNorm.includes(p)).length;
      if (score > melhorScore) {
        melhorScore = score;
        melhor = m;
      }
    }

    return melhorScore >= 1 ? melhor : null;
  }

  // ── Busca regional (mesorregião / região) ────────────────────────────────

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

  private detectarRegiao(texto: string): { campo: 'mesorregiao' | 'regiao'; valor: string } | null {
    const norm = this.normalizarNome(texto);
    for (const [chave, cfg] of Object.entries(this.REGIOES_MAP)) {
      if (norm.includes(chave)) return cfg;
    }
    return null;
  }

  private async buscarMunicipiosPorRegiao(campo: 'mesorregiao' | 'regiao', valor: string): Promise<any[]> {
    return this.municipios().findMany({
      where: { uf: 'SP', [campo]: valor },
      select: {
        id: true, nome: true, mesorregiao: true, rm_ra: true, regiao: true, bloco: true,
        projecao_votos: true, projecao_base: true, projecao_2: true, projecao_apoio_iurd: true,
        lideranca: true, coordenacao: true, funcao_cargo: true,
        coord_lideranca_2: true, funcao_cargo_2: true,
        votos_22: true, eleitores_22: true, votos_validos_22: true,
        percentual_mv: true, ranking_mv: true,
      },
      orderBy: { eleitores_22: 'desc' },
    });
  }

  private contextoRegiao(cidades: any[], nomeRegiao: string): string {
    const totalVotos22 = cidades.reduce((s, c) => s + (c.votos_22 || 0), 0);
    const totalMeta = cidades.reduce((s, c) => {
      const contrib = [c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean).reduce((a: number, b: number) => a + b, 0);
      return s + (c.votos_22 || 0) + contrib;
    }, 0);
    const linhas: string[] = [
      `📊 Região *${nomeRegiao}* — ${cidades.length} municípios:`,
      `• Total votos MV 2022: ${totalVotos22.toLocaleString('pt-BR')} | Meta mínima 2026: ${totalMeta.toLocaleString('pt-BR')}`,
      '',
    ];
    for (const c of cidades) {
      const contrib = [c.projecao_votos, c.projecao_base, c.projecao_2, c.projecao_apoio_iurd].filter(Boolean).reduce((a: number, b: number) => a + b, 0);
      const meta = (c.votos_22 || 0) + contrib;
      linhas.push(`🏙️ ${c.nome}`);
      linhas.push(`  2022: ${(c.votos_22 || 0).toLocaleString('pt-BR')} votos | #${c.ranking_mv || '?'}º ranking | ${c.percentual_mv ? (c.percentual_mv * 100).toFixed(2) + '%' : '0%'} | ${(c.eleitores_22 || 0).toLocaleString('pt-BR')} eleitores`);
      if (c.lideranca || c.coordenacao) {
        linhas.push(`  Liderança: ${c.lideranca || '-'} | Coord.: ${c.coordenacao || '-'}`);
      }
      if (c.projecao_2 || c.coord_lideranca_2) {
        linhas.push(`  Liderança 2: ${c.coord_lideranca_2 || '-'} | Proj.2: ${c.projecao_2 ? c.projecao_2.toLocaleString('pt-BR') : '-'}`);
      }
      if (contrib > 0) {
        linhas.push(`  Projeções 2026: +${contrib.toLocaleString('pt-BR')} | META MÍNIMA: ${meta.toLocaleString('pt-BR')}`);
      }
    }
    return linhas.join('\n');
  }

  // ── Contexto de município para a IA ──────────────────────────────────────

  private contextoMunicipio(mun: any): string {
    const linhas: string[] = [`📊 Dados de *${mun.nome}* (Eleições 2026):`];
    if (mun.mesorregiao) linhas.push(`• Mesorregião: ${mun.mesorregiao}`);
    if (mun.rm_ra) linhas.push(`• RM/RA: ${mun.rm_ra}`);
    if (mun.regiao) linhas.push(`• Região: ${mun.regiao}`);
    // Votos 2022 (base histórica)
    if (mun.votos_22) linhas.push(`• Votos em 2022 (base histórica): ${mun.votos_22.toLocaleString('pt-BR')}`);
    if (mun.eleitores_22) linhas.push(`• Eleitores em 2022: ${mun.eleitores_22.toLocaleString('pt-BR')}`);
    if (mun.votos_validos_22) linhas.push(`• Votos válidos 2022: ${mun.votos_validos_22.toLocaleString('pt-BR')}`);
    if (mun.percentual_mv) linhas.push(`• % dos votos válidos 2022: ${(mun.percentual_mv * 100).toFixed(2)}%`);
    if (mun.ranking_mv) linhas.push(`• Ranking entre deputados federais 2022: ${mun.ranking_mv}º lugar`);
    // Projeções 2026 (trabalho de lideranças — paralelo ao mínimo de 2022)
    if (mun.projecao_votos) linhas.push(`• Votos projetados pela liderança 1 (2026): ${mun.projecao_votos.toLocaleString('pt-BR')}`);
    if (mun.projecao_base) linhas.push(`• Votos projetados pela base (2026): ${mun.projecao_base.toLocaleString('pt-BR')}`);
    if (mun.lideranca) linhas.push(`• Liderança 1: ${mun.lideranca}${mun.funcao_cargo ? ` (${mun.funcao_cargo})` : ''}`);
    if (mun.coordenacao) linhas.push(`• Coordenação 1: ${mun.coordenacao}`);
    if (mun.projecao_2) linhas.push(`• Votos projetados pela liderança 2 (2026): ${mun.projecao_2.toLocaleString('pt-BR')}`);
    if (mun.coord_lideranca_2) linhas.push(`• Liderança 2: ${mun.coord_lideranca_2}${mun.funcao_cargo_2 ? ` (${mun.funcao_cargo_2})` : ''}`);
    if (mun.projecao_apoio_iurd) linhas.push(`• Votos projetados apoio IURD (2026): ${mun.projecao_apoio_iurd.toLocaleString('pt-BR')}`);
    // Meta mínima consolidada
    const contribuicoes = [mun.projecao_votos, mun.projecao_base, mun.projecao_2, mun.projecao_apoio_iurd].filter(Boolean);
    const totalContribuicoes = contribuicoes.reduce((s: number, v: number) => s + v, 0);
    if (mun.votos_22 && totalContribuicoes > 0) {
      linhas.push(`• META MÍNIMA 2026 (base 2022 + lideranças): ${(mun.votos_22 + totalContribuicoes).toLocaleString('pt-BR')} votos`);
    }
    if (mun.candidato_nome) linhas.push(`• Candidato vinculado: ${mun.candidato_nome} (${mun.candidato_cargo || ''})`);
    return linhas.join('\n');
  }

  // ── Chamada OpenAI ────────────────────────────────────────────────────────

  private async gerarRespostaIA(
    userText: string,
    nome: string,
    extraContexto?: string,
  ): Promise<string | null> {
    const modelName = (await this.integracoes.getPlain('openai', 'model')).trim();
    const apiKey = (await this.integracoes.getPlain('openai', 'apiKey')).trim();
    if (!modelName || !apiKey) return null;

    let systemContent = SYSTEM_PROMPT;
    const saudacaoAtual = this.saudacao();
    systemContent += `\n\nHORÁRIO ATUAL (Brasil): ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}h. Saudação correta agora: "${saudacaoAtual}". SEMPRE use esta saudação — NUNCA espelhe a saudação que o usuário enviou.`;
    if (nome) {
      systemContent += `\n\nNOME DO USUÁRIO: *${nome}*. Use o nome em TODAS as respostas.`;
    }
    if (extraContexto) {
      systemContent += `\n\nCONTEXTO ADICIONAL (use para responder):\n${extraContexto}`;
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 25000);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.5,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userText },
          ],
        }),
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || `Erro OpenAI (${res.status})`);
      const out = data?.choices?.[0]?.message?.content;
      return typeof out === 'string' && out.trim() ? out.trim() : null;
    } catch (e) {
      this.logger.error(`Erro OpenAI: ${e}`);
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  // ── Envio de mensagem ─────────────────────────────────────────────────────

  // ── Stickers ──────────────────────────────────────────────────────────────

  private escolherSticker(categoria: string): string | null {
    try {
      const dir = path.join(process.cwd(), 'stickers', categoria);
      if (!fs.existsSync(dir)) return null;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp'));
      if (files.length === 0) return null;
      const file = files[Math.floor(Math.random() * files.length)];
      const backendUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      return `${backendUrl}/stickers/${categoria}/${file}`;
    } catch {
      return null;
    }
  }

  private async enviarSticker(number: string, categoria: string): Promise<void> {
    const stickerUrl = this.escolherSticker(categoria);
    if (!stickerUrl) return;
    try {
      await this.evolution.sendSticker({ number, stickerUrl });
    } catch {
      // sticker failure is non-fatal
    }
  }

  private async enviar(number: string, text: string, contatoId?: bigint) {
    await this.evolution.sendText({ number, text });
    if (contatoId) await this.salvarMensagem(contatoId, 'BOT', text);
  }

  // ── Handler principal ─────────────────────────────────────────────────────

  async handleEvolutionWebhook(input: EvolutionWebhookInput) {
    await this.verifyEvolutionWebhook(input);

    this.cleanDedup();
    const parsed = this.parseEvolution(input.body);
    if (!parsed || !parsed.number) return { ok: true };
    if (parsed.fromMe) return { ok: true };

    const dedupKey = parsed.messageId
      ? `msg:${parsed.messageId}`
      : `jid:${parsed.remoteJid}:${parsed.text || ''}`;
    if (this.dedup.has(dedupKey)) return { ok: true };
    this.dedup.set(dedupKey, Date.now());

    const telefone = parsed.number;
    const textoUsuario = (parsed.text || '').trim();
    const contato = await this.getOrCreateContato(telefone);
    const saudacao = this.saudacao();

    // Salva a mensagem do usuário
    if (textoUsuario) {
      await this.salvarMensagem(contato.id, 'USUARIO', textoUsuario);
    }

    let resposta: string;

    // ── Estado: NOVO ────────────────────────────────────────────────────────
    if (contato.estado === 'NOVO') {
      resposta =
        `${saudacao}! 🏛️ Bem-vindo ao *Legisboat*, a inteligência artificial da estrutura *Grupo Milton Vieira – Eleições 2026*, desenvolvida pela *ShiftWorks*.\n\n` +
        `Para começarmos, qual é o seu nome?`;
      await this.contatos().update({ where: { telefone }, data: { estado: 'AGUARDANDO_NOME' } });
    }

    // ── Estado: AGUARDANDO_NOME ─────────────────────────────────────────────
    else if (contato.estado === 'AGUARDANDO_NOME') {
      const nomeBruto = textoUsuario || '';
      const nome =
        nomeBruto.length > 0 && nomeBruto.length <= 80
          ? nomeBruto
              .split(' ')
              .slice(0, 2)
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')
          : 'Cidadão';
      await this.contatos().update({
        where: { telefone },
        data: { nome, estado: 'AGUARDANDO_CIDADE' },
      });
      resposta =
        await this.gerarRespostaIA(
          `O usuário informou o nome "${nome}". Cumprimente-o brevemente pelo nome, confirme que foi registrado, e pergunte em qual cidade ele atua na campanha das Eleições 2026 do Grupo Milton Vieira.`,
          nome,
        ) ||
        `Prazer, *${nome}*! 🤝 Nome registrado com sucesso.\n\nEm qual cidade você atua na campanha das *Eleições 2026*?`;
    }

    // ── Estado: AGUARDANDO_CIDADE ───────────────────────────────────────────
    else if (contato.estado === 'AGUARDANDO_CIDADE') {
      const nome = contato.nome || 'Cidadão';
      const municipio = textoUsuario ? await this.buscarMunicipio(textoUsuario) : null;

      if (municipio) {
        await this.contatos().update({
          where: { telefone },
          data: { municipio_id: municipio.id, estado: 'ATIVO' },
        });
        const ctx = this.contextoMunicipio(municipio);
        resposta =
          await this.gerarRespostaIA(
            `O usuário ${nome} confirmou que atua em ${municipio.nome}. Apresente um resumo amigável e motivador dos dados da cidade para a campanha, usando os dados abaixo. Seja conciso e use o estilo WhatsApp.`,
            nome,
            ctx,
          ) ||
          `*${municipio.nome}* registrada, *${nome}*! 🚀\n\nProjeção: *${municipio.projecao_votos?.toLocaleString('pt-BR') || '—'}* votos. Temos trabalho a fazer! Em que posso ajudar?`;
      } else {
        // Cidade não encontrada — pede confirmação
        resposta =
          `Hmm, *${nome}*, não encontrei "${textoUsuario}" na nossa base de municípios de SP. 🏛️\n\n` +
          `Pode confirmar o nome exato da cidade? (Ex: "São Paulo", "Campinas", "São José dos Campos")`;
      }
    }

    // ── Estado: ATIVO ───────────────────────────────────────────────────────
    else {
      const nome = contato.nome || '';

      if (!textoUsuario) {
        resposta = nome
          ? `Pois não, *${nome}*? Em que posso ajudar? 🚀`
          : 'Em que posso ajudar? 🚀';
      } else {
        // Enriquece contexto com dados do município do contato
        let extraContexto: string | undefined;
        if (contato.municipio_id) {
          try {
            const mun = await this.municipios().findUnique({
              where: { id: contato.municipio_id },
              select: {
                id: true, nome: true, mesorregiao: true, rm_ra: true, regiao: true,
                projecao_votos: true, projecao_base: true, lideranca: true,
                coordenacao: true, funcao_cargo: true,
                projecao_2: true, coord_lideranca_2: true, funcao_cargo_2: true,
                votos_22: true, eleitores_22: true,
                votos_validos_22: true, percentual_mv: true, ranking_mv: true,
                projecao_apoio_iurd: true, candidato_nome: true, candidato_cargo: true,
              },
            });
            if (mun) extraContexto = this.contextoMunicipio(mun);
          } catch (e) {
            this.logger.warn(`Erro ao carregar município do contato: ${e}`);
          }
        }

        // Verifica se usuário está perguntando sobre outra cidade ou região
        const outraMunicipio = await this.buscarMunicipio(textoUsuario);
        if (outraMunicipio && outraMunicipio.id !== contato.municipio_id) {
          extraContexto = this.contextoMunicipio(outraMunicipio);
        } else if (!outraMunicipio) {
          const regiao = this.detectarRegiao(textoUsuario);
          if (regiao) {
            const cidades = await this.buscarMunicipiosPorRegiao(regiao.campo, regiao.valor);
            if (cidades.length > 0) extraContexto = this.contextoRegiao(cidades, regiao.valor);
          }
        }

        resposta =
          await this.gerarRespostaIA(textoUsuario, nome, extraContexto) ||
          (nome
            ? `Recebi, *${nome}*. Em que posso ajudar com as *Eleições 2026*? 🏛️`
            : 'Recebi. Em que posso ajudar? 🏛️');
      }
    }

    await this.enviar(telefone, resposta, contato.id);

    // Sticker
    let stickerCategoria: string | null = null;
    if (contato.estado === 'NOVO') {
      stickerCategoria = 'saudacao';
    } else if (contato.estado === 'AGUARDANDO_NOME') {
      stickerCategoria = 'saudacao';
    } else if (contato.estado === 'ATIVO' || (!['NOVO', 'AGUARDANDO_NOME', 'AGUARDANDO_CIDADE'].includes(contato.estado as string))) {
      const respostaLower = resposta.toLowerCase();
      const textLower = textoUsuario.toLowerCase();
      if (/bora ganhar/i.test(respostaLower)) {
        stickerCategoria = 'comemoracao';
      } else if (/\b(tchau|até logo|até mais|obrigado|obrigada|valeu|flw)\b/i.test(textLower)) {
        stickerCategoria = 'despedida';
      } else if (Math.random() < 0.3) {
        stickerCategoria = 'aprovacao';
      }
    }
    if (stickerCategoria) {
      await this.enviarSticker(telefone, stickerCategoria);
    }

    return { ok: true };
  }

  // ── Simulação (sem Evolution) ─────────────────────────────────────────────

  async simulateMessage(input: { phone?: string; name?: string; message: string }) {
    const telefone = (input.phone || '5500000000000').replace(/\D/g, '');
    const nome = input.name || 'Simulação';
    const textoUsuario = input.message?.trim();
    if (!textoUsuario) return { response: '' };

    const contato = await this.getOrCreateContato(telefone);
    if (nome && !contato.nome) {
      await this.contatos().update({ where: { id: contato.id }, data: { nome } });
    }

    await this.salvarMensagem(contato.id, 'USUARIO', textoUsuario);

    let extraContexto: string | undefined;

    // Carrega contexto do município cadastrado do contato
    if (contato.municipio_id) {
      try {
        const munContato = await this.municipios().findUnique({
          where: { id: contato.municipio_id },
          select: {
            id: true, nome: true, mesorregiao: true, rm_ra: true, regiao: true,
            projecao_votos: true, projecao_base: true, lideranca: true,
            coordenacao: true, votos_22: true, eleitores_22: true,
            votos_validos_22: true, percentual_mv: true, ranking_mv: true,
            projecao_apoio_iurd: true, candidato_nome: true, candidato_cargo: true,
          },
        });
        if (munContato) extraContexto = this.contextoMunicipio(munContato);
      } catch (e) {
        this.logger.warn(`Erro ao carregar município do contato (simulate): ${e}`);
      }
    }

    // Verifica se a mensagem menciona outra cidade ou região
    const mun = await this.buscarMunicipio(textoUsuario);
    if (mun && (!contato.municipio_id || String(mun.id) !== String(contato.municipio_id))) {
      extraContexto = this.contextoMunicipio(mun);
    } else if (!mun) {
      const regiao = this.detectarRegiao(textoUsuario);
      if (regiao) {
        const cidades = await this.buscarMunicipiosPorRegiao(regiao.campo, regiao.valor);
        if (cidades.length > 0) extraContexto = this.contextoRegiao(cidades, regiao.valor);
      }
    }

    const resposta =
      (await this.gerarRespostaIA(textoUsuario, nome, extraContexto)) ||
      `Recebi, *${nome}*. Em que posso ajudar com as *Eleições 2026*? 🏛️`;

    await this.salvarMensagem(contato.id, 'BOT', resposta);

    // Sticker preview for simulation
    let stickerUrl: string | null = null;
    const respostaLower = resposta.toLowerCase();
    const textLower = textoUsuario.toLowerCase();
    if (/bora ganhar/i.test(respostaLower)) {
      stickerUrl = this.escolherSticker('comemoracao');
    } else if (/\b(tchau|até logo|até mais|obrigado|obrigada|valeu|flw)\b/i.test(textLower)) {
      stickerUrl = this.escolherSticker('despedida');
    } else if (Math.random() < 0.3) {
      stickerUrl = this.escolherSticker('aprovacao');
    }

    return { response: resposta, stickerUrl };
  }
}
