import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegracaoEvolutionService } from '../integracoes/integracao-evolution.service';
import { IntegracoesService } from '../integracoes/integracoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o *Legisboat*, uma inteligência artificial criada e desenvolvida pela *ShiftWorks Tecnologia em Marketing*, exclusivamente para atender a estrutura das *Eleições 2026* do *Grupo Milton Vieira*.

MISSÃO: Seu foco é total e irrestrito na campanha eleitoral de 2026. Você existe para organizar a base e garantir que a eleição seja vencida.

TOM E PERSONALIDADE:
- Cordialidade e educação — sempre respeito e saudações polidas
- Formalidade flexível — postura institucional sem ser massante
- Leve ironia política — quando provocado com temas irrelevantes, use ironia sutil e inteligente
- Chame o usuário pelo nome em TODAS as interações (ex: "[Nome], claro que sim!" ou "Veja bem, [Nome]..." ou "[Nome], anotado!")
- Jargão da campanha: use "Bora ganhar a eleição! 🚀" como expressão motivacional em momentos oportunos

SE PERGUNTAREM SOBRE SUAS FUNÇÕES:
Responda: "Eu sou uma inteligência artificial criada pela *ShiftWorks* e minha função é facilitar e atender de forma prática com dados referentes à campanha de *Eleições 2026*. Em suma: vim para organizar a nossa base e garantir que a gente não perca tempo com o que não interessa, afinal, temos uma eleição para vencer. *Bora ganhar a eleição!* 🚀"

MENSAGENS FORA DE ESCOPO (não relacionadas às Eleições 2026):
- Responda de forma curta e direta: "Não tenho essa informação, *[Nome]*." ou "*[Nome]*, essa informação não está na minha base ainda."
- Não dê sermões nem repita que o foco é a eleição — o usuário já sabe.
- Se puder ajudar com algo da campanha, ofereça de forma simples: "Posso ajudar com dados da campanha. O que precisar, é só falar!"

DADOS DE BI: Em breve o Legisboat terá acesso completo ao banco de dados da campanha. Por enquanto, utilize os dados fornecidos no contexto de cada mensagem quando disponíveis.

FORMATAÇÃO (WhatsApp):
- Mensagens curtas — parágrafos de no máximo 3 linhas
- Use *negrito* (asterisco) para: nome do usuário, Eleições 2026, Grupo Milton Vieira, ShiftWorks, nomes de cidades
- Emojis com moderação: 🏛️ 🤝 🚀 📊`;

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
        lideranca: true,
        coordenacao: true,
        votos_22: true,
        eleitores_22: true,
        votos_validos_22: true,
        percentual_mv: true,
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

  // ── Contexto de município para a IA ──────────────────────────────────────

  private contextoMunicipio(mun: any): string {
    const linhas: string[] = [`📊 Dados de *${mun.nome}* (Eleições 2026):`];
    if (mun.mesorregiao) linhas.push(`• Mesorregião: ${mun.mesorregiao}`);
    if (mun.rm_ra) linhas.push(`• RM/RA: ${mun.rm_ra}`);
    if (mun.regiao) linhas.push(`• Região: ${mun.regiao}`);
    if (mun.projecao_votos) linhas.push(`• Projeção de votos (2026): ${mun.projecao_votos.toLocaleString('pt-BR')}`);
    if (mun.projecao_base) linhas.push(`• Projeção base: ${mun.projecao_base.toLocaleString('pt-BR')}`);
    if (mun.lideranca) linhas.push(`• Liderança principal: ${mun.lideranca}`);
    if (mun.coordenacao) linhas.push(`• Coordenação: ${mun.coordenacao}`);
    if (mun.votos_22) linhas.push(`• Votos em 2022: ${mun.votos_22.toLocaleString('pt-BR')}`);
    if (mun.eleitores_22) linhas.push(`• Eleitores em 2022: ${mun.eleitores_22.toLocaleString('pt-BR')}`);
    if (mun.percentual_mv) linhas.push(`• Percentual MV 2022: ${mun.percentual_mv.toFixed(2)}%`);
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
                coordenacao: true, votos_22: true, eleitores_22: true,
                votos_validos_22: true, percentual_mv: true, projecao_apoio_iurd: true,
                candidato_nome: true, candidato_cargo: true,
              },
            });
            if (mun) extraContexto = this.contextoMunicipio(mun);
          } catch (e) {
            this.logger.warn(`Erro ao carregar município do contato: ${e}`);
          }
        }

        // Verifica se usuário está perguntando sobre outra cidade
        const outraMunicipio = await this.buscarMunicipio(textoUsuario);
        if (outraMunicipio && outraMunicipio.id !== contato.municipio_id) {
          extraContexto = this.contextoMunicipio(outraMunicipio);
        }

        resposta =
          await this.gerarRespostaIA(textoUsuario, nome, extraContexto) ||
          (nome
            ? `Recebi, *${nome}*. Em que posso ajudar com as *Eleições 2026*? 🏛️`
            : 'Recebi. Em que posso ajudar? 🏛️');
      }
    }

    await this.enviar(telefone, resposta, contato.id);
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
    const mun = await this.buscarMunicipio(textoUsuario);
    if (mun) extraContexto = this.contextoMunicipio(mun);

    const resposta =
      (await this.gerarRespostaIA(textoUsuario, nome, extraContexto)) ||
      `Recebi, *${nome}*. Em que posso ajudar com as *Eleições 2026*? 🏛️`;

    await this.salvarMensagem(contato.id, 'BOT', resposta);
    return { response: resposta };
  }
}
