import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';

type EvolutionConfig = {
  baseUrl: string;
  instanceName: string;
  apiKeySet: boolean;
};

@Injectable()
export class IntegracaoEvolutionService {
  private namespace = 'evolution';

  constructor(private config: IntegracoesService) {}

  private normalizeBaseUrl(url: string) {
    return (url || '').trim().replace(/\/+$/, '');
  }

  async getConfig(): Promise<EvolutionConfig> {
    const baseUrl = await this.config.getPlain(this.namespace, 'baseUrl');
    const instanceName = await this.config.getPlain(this.namespace, 'instanceName');
    const apiKeyRow = await this.config.get(this.namespace, 'apiKey');
    return { baseUrl, instanceName, apiKeySet: !!apiKeyRow?.valor };
  }

  async saveConfig(input: { baseUrl?: string; instanceName?: string; apiKey?: string }) {
    if (input.baseUrl !== undefined) {
      await this.config.upsert(this.namespace, 'baseUrl', this.normalizeBaseUrl(input.baseUrl), false);
    }
    if (input.instanceName !== undefined) {
      await this.config.upsert(this.namespace, 'instanceName', (input.instanceName || '').trim(), false);
    }
    if (input.apiKey !== undefined && input.apiKey !== '') {
      await this.config.upsert(this.namespace, 'apiKey', (input.apiKey || '').trim(), true);
    }
    return this.getConfig();
  }

  async connect() {
    const baseUrl = this.normalizeBaseUrl(await this.config.getPlain(this.namespace, 'baseUrl'));
    const instanceName = (await this.config.getPlain(this.namespace, 'instanceName')).trim();
    const apiKey = (await this.config.getPlain(this.namespace, 'apiKey')).trim();

    if (!baseUrl) throw new BadRequestException('Base URL do Evolution não configurada');
    if (!instanceName) throw new BadRequestException('Instance Name do Evolution não configurado');
    if (!apiKey) throw new BadRequestException('API Key do Evolution não configurada');

    const url = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { apikey: apiKey },
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new BadRequestException(data?.message || `Erro ao conectar (${res.status})`);
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  }
}
