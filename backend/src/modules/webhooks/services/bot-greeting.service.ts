import { Injectable } from '@nestjs/common';

type PeriodKey = 'manha' | 'tarde' | 'noite';

@Injectable()
export class BotGreetingService {
  // Track last greeting index per contact to avoid consecutive repeats
  private lastGreetingIndex = new Map<string, number>();

  private readonly GREETINGS: Record<PeriodKey, string[]> = {
    manha: [
      'Bom dia! ☀️',
      'Bom dia! 🚀 Dia de campanha!',
      'Bom dia! Vamos ganhar essa eleição? 💪',
    ],
    tarde: [
      'Boa tarde! 🏛️',
      'Boa tarde! 📊 Dados prontos para você!',
      'Boa tarde! Que bom ter você aqui! 🤝',
    ],
    noite: [
      'Boa noite! 🌙',
      'Boa noite! Ainda trabalhando pela campanha? 💪',
      'Boa noite! 🏛️ Vamos ver os dados!',
    ],
  };

  private getPeriod(): PeriodKey {
    const now = new Date();
    const br = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hora = br.getHours();
    if (hora >= 5 && hora < 12) return 'manha';
    if (hora >= 12 && hora < 18) return 'tarde';
    return 'noite';
  }

  getGreeting(telefone: string): string {
    const period = this.getPeriod();
    const options = this.GREETINGS[period];
    const lastIdx = this.lastGreetingIndex.get(`${telefone}:${period}`) ?? -1;

    // Pick a random index that is NOT the same as the last one
    let idx: number;
    if (options.length === 1) {
      idx = 0;
    } else {
      do {
        idx = Math.floor(Math.random() * options.length);
      } while (idx === lastIdx);
    }

    this.lastGreetingIndex.set(`${telefone}:${period}`, idx);
    return options[idx];
  }

  // Get just the period name (for system prompt injection)
  getSaudacaoLabel(): string {
    const period = this.getPeriod();
    if (period === 'manha') return 'Bom dia';
    if (period === 'tarde') return 'Boa tarde';
    return 'Boa noite';
  }
}
