import { Injectable } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';

type OpenAIConfig = {
  model: string;
  apiKeySet: boolean;
};

@Injectable()
export class IntegracaoOpenAIService {
  private namespace = 'openai';

  constructor(private config: IntegracoesService) {}

  async getConfig(): Promise<OpenAIConfig> {
    const model = await this.config.getPlain(this.namespace, 'model');
    const apiKeyRow = await this.config.get(this.namespace, 'apiKey');
    return { model, apiKeySet: !!apiKeyRow?.valor };
  }

  async saveConfig(input: { model?: string; apiKey?: string }) {
    if (input.model !== undefined) {
      await this.config.upsert(this.namespace, 'model', (input.model || '').trim(), false);
    }
    if (input.apiKey !== undefined && input.apiKey !== '') {
      await this.config.upsert(this.namespace, 'apiKey', (input.apiKey || '').trim(), true);
    }
    return this.getConfig();
  }
}
