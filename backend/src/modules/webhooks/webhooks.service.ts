import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IntegracaoEvolutionService } from '../integracoes/integracao-evolution.service';
import { IntegracoesService } from '../integracoes/integracoes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BotSearchService } from './services/bot-search.service';
import { BotContextService } from './services/bot-context.service';
import { BotLLMService } from './services/bot-llm.service';
import { BotSecurityService } from './services/bot-security.service';
import { EvolutionWebhookInput, ParsedMessage } from './bot.types';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private dedup = new Map<string, number>();

  constructor(
    private evolution: IntegracaoEvolutionService,
    private integracoes: IntegracoesService,
    private prisma: PrismaService,
    private botSearch: BotSearchService,
    private botContext: BotContextService,
    private botLLM: BotLLMService,
    private botSecurity: BotSecurityService,
  ) {}

  // ── Prisma helpers ────────────────────────────────────────────────────────

  private contatos() { return (this.prisma as any).botContato; }
  private mensagens() { return (this.prisma as any).botMensagem; }

  // ── Dedup ─────────────────────────────────────────────────────────────────

  private cleanDedup() {
    const now = Date.now();
    for (const [k, t] of this.dedup.entries()) {
      if (now - t > 5 * 60 * 1000) this.dedup.delete(k);
    }
  }

  // ── Greeting by time of day ───────────────────────────────────────────────

  private saudacao(): string {
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hora = br.getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── Message parsing ───────────────────────────────────────────────────────

  private normalizePhoneFromJid(jid?: string) {
    const raw = String(jid || '').split('@')[0] || '';
    return raw.replace(/\D/g, '') || undefined;
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

  // ── Token verification ────────────────────────────────────────────────────

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

  // ── Persistence ───────────────────────────────────────────────────────────

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

  // ── Core: build context + generate response (shared by prod + simulate) ───

  private async buildContextAndRespond(
    textoUsuario: string,
    nome: string,
    contatoId: bigint,
    municipioId?: bigint,
  ): Promise<string> {
    // Load user's registered municipality as base context
    let extraContexto: string | undefined;
    if (municipioId) {
      try {
        const mun = await (this.prisma as any).municipio.findUnique({
          where: { id: municipioId },
          select: {
            id: true, nome: true, mesorregiao: true, rm_ra: true, regiao: true,
            projecao_votos: true, projecao_base: true, lideranca: true,
            coordenacao: true, funcao_cargo: true,
            projecao_2: true, coord_lideranca_2: true, funcao_cargo_2: true,
            votos_22: true, eleitores_22: true,
            votos_validos_22: true, percentual_mv: true, ranking_mv: true,
            projecao_apoio_iurd: true, candidato_nome: true, candidato_cargo: true,
            divisao_regional: true, microrregiao: true, bloco: true,
          },
        });
        if (mun) extraContexto = this.botContext.contextoMunicipio(mun);
      } catch (e) {
        this.logger.warn(`Erro ao carregar município do contato: ${e}`);
      }
    }

    // Run unified 5-step search chain
    const searchResult = await this.botSearch.searchContext(textoUsuario, municipioId);
    const searchContext = this.botContext.buildContextFromSearch(searchResult);
    if (searchContext) extraContexto = searchContext;

    return (
      await this.botLLM.gerarResposta(textoUsuario, nome, contatoId, extraContexto) ||
      (nome ? `Recebi, *${nome}*. Em que posso ajudar com as *Eleições 2026*? 🏛️` : 'Recebi. Em que posso ajudar? 🏛️')
    );
  }

  // ── Sticker selection logic ───────────────────────────────────────────────

  private selectStickerCategoria(estado: string, resposta: string, textoUsuario: string): string | null {
    if (estado === 'NOVO' || estado === 'AGUARDANDO_NOME') return 'saudacao';
    if (/bora ganhar/i.test(resposta)) return 'comemoracao';
    if (/\b(tchau|até logo|até mais|obrigado|obrigada|valeu|flw)\b/i.test(textoUsuario)) return 'despedida';
    if (Math.random() < 0.3) return 'aprovacao';
    return null;
  }

  // ── Main webhook handler ──────────────────────────────────────────────────

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
    const rawTexto = (parsed.text || '').trim();
    const contato = await this.getOrCreateContato(telefone);
    const saudacao = this.saudacao();

    if (rawTexto) {
      await this.salvarMensagem(contato.id, 'USUARIO', rawTexto);
    }

    // Security check
    const security = this.botSecurity.check(rawTexto);
    const textoUsuario = security.sanitized;
    if (!security.safe) {
      const resposta = this.botSecurity.neutralResponse(contato.nome || undefined);
      await this.enviar(telefone, resposta, contato.id);
      return { ok: true };
    }

    let resposta: string;

    if (contato.estado === 'NOVO') {
      resposta =
        `${saudacao}! 🏛️ Bem-vindo ao *Legisboat*, a inteligência artificial da estrutura *Grupo Milton Vieira – Eleições 2026*, desenvolvida pela *ShiftWorks*.\n\n` +
        `Para começarmos, qual é o seu nome?`;
      await this.contatos().update({ where: { telefone }, data: { estado: 'AGUARDANDO_NOME' } });

    } else if (contato.estado === 'AGUARDANDO_NOME') {
      const nomeBruto = textoUsuario || '';
      const nome =
        nomeBruto.length > 0 && nomeBruto.length <= 80
          ? nomeBruto.split(' ').slice(0, 2).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
          : 'Cidadão';
      await this.contatos().update({ where: { telefone }, data: { nome, estado: 'AGUARDANDO_CIDADE' } });
      resposta =
        await this.botLLM.gerarResposta(
          `O usuário informou o nome "${nome}". Cumprimente-o brevemente pelo nome, confirme que foi registrado, e pergunte em qual cidade ele atua na campanha das Eleições 2026 do Grupo Milton Vieira.`,
          nome,
          contato.id,
        ) ||
        `Prazer, *${nome}*! 🤝 Nome registrado com sucesso.\n\nEm qual cidade você atua na campanha das *Eleições 2026*?`;

    } else if (contato.estado === 'AGUARDANDO_CIDADE') {
      const nome = contato.nome || 'Cidadão';
      const municipio = textoUsuario ? await this.botSearch.buscarMunicipio(textoUsuario) : null;

      if (municipio) {
        await this.contatos().update({
          where: { telefone },
          data: { municipio_id: municipio.id, estado: 'ATIVO' },
        });
        const ctx = this.botContext.contextoMunicipio(municipio);
        resposta =
          await this.botLLM.gerarResposta(
            `O usuário ${nome} confirmou que atua em ${municipio.nome}. Apresente um resumo amigável e motivador dos dados da cidade para a campanha, usando os dados abaixo. Seja conciso e use o estilo WhatsApp.`,
            nome,
            contato.id,
            ctx,
          ) ||
          `*${municipio.nome}* registrada, *${nome}*! 🚀\n\nProjeção: *${municipio.projecao_votos?.toLocaleString('pt-BR') || '—'}* votos. Temos trabalho a fazer! Em que posso ajudar?`;
      } else {
        resposta =
          `Hmm, *${nome}*, não encontrei "${textoUsuario}" na nossa base de municípios de SP. 🏛️\n\n` +
          `Pode confirmar o nome exato da cidade? (Ex: "São Paulo", "Campinas", "São José dos Campos")`;
      }

    } else {
      // ATIVO state
      const nome = contato.nome || '';
      if (!textoUsuario) {
        resposta = nome ? `Pois não, *${nome}*? Em que posso ajudar? 🚀` : 'Em que posso ajudar? 🚀';
      } else {
        resposta = await this.buildContextAndRespond(textoUsuario, nome, contato.id, contato.municipio_id);
      }
    }

    await this.enviar(telefone, resposta, contato.id);

    const stickerCategoria = this.selectStickerCategoria(contato.estado as string, resposta, textoUsuario);
    if (stickerCategoria) await this.enviarSticker(telefone, stickerCategoria);

    return { ok: true };
  }

  // ── Simulate (same pipeline as production, no Evolution send) ────────────

  async simulateMessage(input: { phone?: string; name?: string; message: string }) {
    const telefone = (input.phone || '5500000000000').replace(/\D/g, '');
    const nome = input.name || 'Simulação';
    const textoRaw = input.message?.trim();
    if (!textoRaw) return { response: '' };

    const contato = await this.getOrCreateContato(telefone);
    if (nome && !contato.nome) {
      await this.contatos().update({ where: { id: contato.id }, data: { nome } });
    }

    await this.salvarMensagem(contato.id, 'USUARIO', textoRaw);

    // Security check
    const security = this.botSecurity.check(textoRaw);
    const textoUsuario = security.sanitized;
    if (!security.safe) {
      const resposta = this.botSecurity.neutralResponse(nome);
      await this.salvarMensagem(contato.id, 'BOT', resposta);
      return { response: resposta, stickerUrl: null };
    }

    const resposta = await this.buildContextAndRespond(textoUsuario, nome, contato.id, contato.municipio_id);
    await this.salvarMensagem(contato.id, 'BOT', resposta);

    const respostaLower = resposta.toLowerCase();
    const textLower = textoUsuario.toLowerCase();
    let stickerUrl: string | null = null;
    if (/bora ganhar/i.test(respostaLower)) stickerUrl = this.escolherSticker('comemoracao');
    else if (/\b(tchau|até logo|até mais|obrigado|obrigada|valeu|flw)\b/i.test(textLower)) stickerUrl = this.escolherSticker('despedida');
    else if (Math.random() < 0.3) stickerUrl = this.escolherSticker('aprovacao');

    return { response: resposta, stickerUrl };
  }
}
