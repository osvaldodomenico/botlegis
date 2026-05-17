import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegracaoEvolutionService } from '../integracoes/integracao-evolution.service';
import { IntegracoesService } from '../integracoes/integracoes.service';
import crypto from 'crypto';

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

@Injectable()
export class WebhooksService {
  private dedup = new Map<string, number>();

  constructor(
    private evolution: IntegracaoEvolutionService,
    private integracoes: IntegracoesService,
  ) {}

  private cleanDedup() {
    const now = Date.now();
    for (const [k, t] of this.dedup.entries()) {
      if (now - t > 5 * 60 * 1000) this.dedup.delete(k);
    }
  }

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
    const number = this.normalizePhoneFromJid(remoteJid) || (b?.data?.number ? String(b.data.number).replace(/\D/g, '') : undefined);

    if (!number) return null;
    return { messageId, fromMe, remoteJid, number, text };
  }

  private async verifyEvolutionWebhook(input: EvolutionWebhookInput) {
    const configured = (await this.evolution.getWebhookTokenPlain()).trim();
    if (!configured) return;

    const headerToken = String(input.headers?.['x-webhook-token'] || input.headers?.['x-evolution-webhook-token'] || '').trim();
    const provided = String(input.token || headerToken || '').trim();

    const a = Buffer.from(configured);
    const b = Buffer.from(provided);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) throw new BadRequestException('Webhook token inválido');
  }

  private async gerarResposta(text: string) {
    const model = (await this.integracoes.getPlain('openai', 'model')).trim();
    const apiKey = (await this.integracoes.getPlain('openai', 'apiKey')).trim();

    if (!model || !apiKey) {
      if (!text) return 'Mensagem recebida.';
      return `Recebi: ${text}`;
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'Você é um assistente do Legis BOT. Responda em português, de forma objetiva e útil. Se faltar contexto, faça uma pergunta curta.' },
            { role: 'user', content: text || '' },
          ],
        }),
        signal: ac.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new BadRequestException(data?.error?.message || `Erro OpenAI (${res.status})`);
      const out = data?.choices?.[0]?.message?.content;
      if (typeof out === 'string' && out.trim()) return out.trim();
      return 'Ok.';
    } finally {
      clearTimeout(t);
    }
  }

  async handleEvolutionWebhook(input: EvolutionWebhookInput) {
    await this.verifyEvolutionWebhook(input);

    this.cleanDedup();
    const parsed = this.parseEvolution(input.body);
    if (!parsed) return { ok: true };
    if (parsed.fromMe) return { ok: true };

    const dedupKey = parsed.messageId ? `msg:${parsed.messageId}` : `jid:${parsed.remoteJid}:${parsed.text || ''}`;
    if (this.dedup.has(dedupKey)) return { ok: true };
    this.dedup.set(dedupKey, Date.now());

    const resposta = await this.gerarResposta(parsed.text || '');
    await this.evolution.sendText({ number: parsed.number!, text: resposta });

    return { ok: true };
  }
}
