import { Injectable } from '@nestjs/common';
import { BotIntent } from '../bot.types';

type IntentRule = {
  intent: BotIntent;
  patterns: RegExp[];
};

@Injectable()
export class BotIntentService {
  private readonly RULES: IntentRule[] = [
    {
      intent: 'SAUDACAO',
      patterns: [
        /^(oi|ola|olá|oie|oii|eai|e aí|e ai|hey|hello|bom dia|boa tarde|boa noite|boas|salve|fala|opa|eae|falaaa?|oiii?)[!?\s.,]*$/i,
        /^(tudo bem|tudo certo|tudo bom|como vai|como estás|como está|beleza|blz|tmj|td bem|td bom)[?!\s.]*$/i,
      ],
    },
    {
      intent: 'DESPEDIDA',
      patterns: [
        /\b(tchau|até logo|até mais|até amanhã|ate logo|ate mais|flw|falou|valeu|obrigado|obrigada|muito obrigado)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_ESTRATEGIA',
      patterns: [
        /\b(qual|onde|quais)\b.*(cidade|municip).*(trabalhar|focar|priorizar|intensid)/i,
        /\b(mais fraco|mais forte|maior potencial|menor presença|pior resultado|melhor resultado)\b/i,
        /\b(estratégia|estrategia|prioridade|priorizar|focar|foco)\b/i,
        /\b(potencial inexplorado|zona branca|sem voto|nenhum voto)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_RANKING',
      patterns: [
        /\b(ranking|classificação|classificacao|posição|posicao|colocação|colocacao)\b/i,
        /\b(top|melhor|maior votaç|mais voto)\b/i,
        /\b(top\s*\d+|primeiros|melhores cidades)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_PROJECAO',
      patterns: [
        /\b(projeção|projecao|projetados|projetamos|vamos conseguir|quantos votos)\b/i,
        /\b(previsão|previsao|estimativa|esperamos|esperado)\b/i,
        /\b(quanto falta|faltam quantos|quantos faltam)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_COMPARACAO',
      patterns: [
        /\b(compar|diferença entre|diferenca entre|versus|vs\.?)\b/i,
        /\bmelhor (que|do que)\b/i,
        /\b(dobrada|dobrado|dobramos|crescimento|evolução|evoluiu)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_META',
      patterns: [
        /\b(meta|metas|objetivo|alvo|precisamos de|necessário|necessario)\b/i,
        /\b(atingir|bater a meta|cumprir)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_BLOCO',
      patterns: [
        /\b(bloco|blocos|divisão regional|divisao regional|microrregião|microrregiao)\b/i,
        /\b(rm\b|ra\b|rm\/ra)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_LIDERANCA',
      patterns: [
        /\b(liderança|lideranca|líder|lider|coordenador|coordenação|coordenacao|parceria|apoiador)\b/i,
        /\b(quem (é|e) (nossa|nosso|o|a)|temos (alguém|alguem)|quem coordena)\b/i,
        /\b(nossa base|base de apoio|apoiadores)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_CARGO',
      patterns: [
        /\b(prefeito|prefeita|vereador|vereadora|pastor|secretário|secretario|suplente|vice)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_REGIAO',
      patterns: [
        /\b(região|regiao|mesorregião|mesorregiao|vale do paraíba|vale do paraiba|metropolitan|litoral|interior)\b/i,
        /\b(cidades (do|da|de)|municípios (do|da|de))\b/i,
      ],
    },
    {
      intent: 'CONSULTA_CIDADE',
      patterns: [
        /\b(como (foi|estamos|está|esta|tá|ta) em|dados (de|do|da)|votos em|resultado em)\b/i,
        /\b(me (fala|fale|diz) (de|sobre|da|do))\b/i,
        /\b(situação|situacao) (de|do|da|em)\b/i,
        /\b(campinas|são paulo|sao paulo|sjc|s\.j\.c|são josé dos campos|taubaté|taubate|guarulhos|osasco|ribeirão|ribeirao|sorocaba|santos|mogi)\b/i,
      ],
    },
    {
      intent: 'CONSULTA_BASE',
      patterns: [
        /\b(externo|externa|por fora|fora da igreja|fora da iurd)\b/i,
        /\b(base institui[çc][aã]o|iurd|igreja|universal|dentro da igreja|de dentro)\b/i,
        /\b(base apoiadores?|apoio externo|apoio interno)\b/i,
        /\b(quantos votos.*(externo|igreja|iurd|apoiador))\b/i,
        /\b((externo|igreja|iurd|apoiador).*quantos votos)\b/i,
      ],
    },
    {
      intent: 'FORA_ESCOPO',
      patterns: [
        /\b(bola|futebol|jogo|receita|culinária|culinaria|clima|tempo|notícia|noticia|música|musica|filme|serie|netflix)\b/i,
        /\b(whatsapp|instagram|tiktok|youtube|twitter|facebook)\b/i,
      ],
    },
  ];

  classify(texto: string): BotIntent {
    const lower = texto.toLowerCase().trim();

    for (const rule of this.RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(lower)) {
          return rule.intent;
        }
      }
    }

    return 'DESCONHECIDO';
  }

  // Convenience checks
  isSaudacao(intent: BotIntent): boolean {
    return intent === 'SAUDACAO';
  }

  isDespedida(intent: BotIntent): boolean {
    return intent === 'DESPEDIDA';
  }

  isConsulta(intent: BotIntent): boolean {
    return intent.startsWith('CONSULTA_');
  }
}
