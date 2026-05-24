import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegracoesService } from '../../integracoes/integracoes.service';
import { BotContextService } from './bot-context.service';
import { BotValidatorService } from './bot-validator.service';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';

@Injectable()
export class BotLLMService {
  private readonly logger = new Logger(BotLLMService.name);

  constructor(
    private prisma: PrismaService,
    private integracoes: IntegracoesService,
    private botContext: BotContextService,
    private botValidator: BotValidatorService,
  ) {}

  private mensagens() {
    return (this.prisma as any).botMensagem;
  }

  private saudacao(): string {
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hora = br.getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ── Fetch last 10 messages for conversation history ───────────────────────

  private async fetchHistory(contatoId: bigint): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    try {
      const msgs = await this.mensagens().findMany({
        where: { contato_id: contatoId },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: { direcao: true, texto: true },
      });

      // Reverse to chronological order (oldest first)
      return msgs
        .reverse()
        .map((m: { direcao: string; texto: string }) => ({
          role: m.direcao === 'USUARIO' ? 'user' : 'assistant',
          content: m.texto,
        }));
    } catch (e) {
      this.logger.warn(`Erro ao buscar histórico: ${e}`);
      return [];
    }
  }

  // ── Generate AI response with full conversation history ───────────────────

  async gerarResposta(
    userText: string,
    nome: string,
    contatoId: bigint,
    extraContexto?: string,
  ): Promise<string | null> {
    const modelName = (await this.integracoes.getPlain('openai', 'model')).trim();
    const apiKey = (await this.integracoes.getPlain('openai', 'apiKey')).trim();
    if (!modelName || !apiKey) return null;

    // Build system prompt with dynamic context
    const saudacaoAtual = this.saudacao();
    let systemContent = SYSTEM_PROMPT;
    systemContent += `\n\n${this.botContext.buildElectionSummary()}`;
    systemContent += `\n\nHORÁRIO ATUAL (Brasil): ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}h. Saudação correta agora: "${saudacaoAtual}". SEMPRE use esta saudação — NUNCA espelhe a saudação que o usuário enviou.`;
    if (nome) {
      systemContent += `\n\nNOME DO USUÁRIO: *${nome}*. Use o nome em TODAS as respostas.`;
    }
    if (extraContexto) {
      systemContent += `\n\nCONTEXTO ADICIONAL (use para responder):\n${extraContexto}`;
    }

    // Fetch conversation history
    const history = await this.fetchHistory(contatoId);

    // Build messages array: system + history + current user message
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemContent },
      ...history,
      { role: 'user', content: userText },
    ];

    const callOpenAI = async (msgs: Array<{ role: string; content: string }>): Promise<string | null> => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 25000);
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.3,
            max_tokens: 800,
            messages: msgs,
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
    };

    try {
      const firstOut = await callOpenAI(messages);
      if (!firstOut) return null;

      const firstValidation = this.botValidator.validate(firstOut, extraContexto);

      if (!firstValidation.valid) {
        const hasHallucination = firstValidation.issues.some(i => i.startsWith('possible_hallucination'));
        const hasRepetition = firstValidation.issues.includes('repetitive_response');

        if (hasHallucination || hasRepetition) {
          const retryInstruction = hasHallucination
            ? 'INSTRUÇÃO: Use APENAS os números que aparecem explicitamente no contexto fornecido. Não some, não estime, não invente. Reescreva a resposta anterior.'
            : 'INSTRUÇÃO: Sua resposta anterior ficou repetitiva. Reescreva de forma mais direta e variada — cada liderança em uma linha concisa, sem repetir frases como "integra a base local" ou "Adicionalmente". Vá direto ao ponto.';
          this.logger.warn(`${hasHallucination ? 'Hallucination' : 'Repetition'} detected — retrying`);
          const retryMessages = [
            ...messages,
            { role: 'assistant', content: firstOut },
            { role: 'user', content: retryInstruction },
          ];
          const retryOut = await callOpenAI(retryMessages);
          if (retryOut) {
            const retryValidation = this.botValidator.validate(retryOut, extraContexto);
            return retryValidation.response;
          }
          return firstValidation.response;
        }
      }

      return firstValidation.response;
    } catch (e) {
      this.logger.error(`Erro gerarResposta: ${e}`);
      return null;
    }
  }
}
