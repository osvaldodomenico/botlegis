import { BadRequestException, Injectable } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';

type EvolutionConfig = {
  baseUrl: string;
  instanceName: string;
  apiKeySet: boolean;
  webhookTokenSet: boolean;
  webhookUrl: string;
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
    const webhookUrl = await this.config.getPlain(this.namespace, 'webhookUrl');
    const apiKeyRow = await this.config.get(this.namespace, 'apiKey');
    const webhookTokenRow = await this.config.get(this.namespace, 'webhookToken');
    return { baseUrl, instanceName, webhookUrl, apiKeySet: !!apiKeyRow?.valor, webhookTokenSet: !!webhookTokenRow?.valor };
  }

  async saveConfig(input: { baseUrl?: string; instanceName?: string; apiKey?: string; webhookToken?: string; webhookUrl?: string }) {
    if (input.baseUrl !== undefined) {
      await this.config.upsert(this.namespace, 'baseUrl', this.normalizeBaseUrl(input.baseUrl), false);
    }
    if (input.instanceName !== undefined) {
      await this.config.upsert(this.namespace, 'instanceName', (input.instanceName || '').trim(), false);
    }
    if (input.apiKey !== undefined && input.apiKey !== '') {
      await this.config.upsert(this.namespace, 'apiKey', (input.apiKey || '').trim(), true);
    }
    if (input.webhookToken !== undefined && input.webhookToken !== '') {
      await this.config.upsert(this.namespace, 'webhookToken', (input.webhookToken || '').trim(), true);
    }
    if (input.webhookUrl !== undefined) {
      await this.config.upsert(this.namespace, 'webhookUrl', (input.webhookUrl || '').trim(), false);
    }
    return this.getConfig();
  }

  async getWebhookTokenPlain() {
    return (await this.config.getPlain(this.namespace, 'webhookToken')).trim();
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

  async configurarWebhook(webhookUrlOverride?: string) {
    const baseUrl = this.normalizeBaseUrl(await this.config.getPlain(this.namespace, 'baseUrl'));
    const instanceName = (await this.config.getPlain(this.namespace, 'instanceName')).trim();
    const apiKey = (await this.config.getPlain(this.namespace, 'apiKey')).trim();

    // Usa override se fornecido, senão lê do banco
    let webhookUrl = webhookUrlOverride?.trim() || (await this.config.getPlain(this.namespace, 'webhookUrl')).trim();

    // Se veio override, persiste no banco
    if (webhookUrlOverride?.trim()) {
      await this.config.upsert(this.namespace, 'webhookUrl', webhookUrlOverride.trim(), false);
    }

    if (!baseUrl) throw new BadRequestException('Base URL do Evolution não configurada');
    if (!instanceName) throw new BadRequestException('Instance Name do Evolution não configurado');
    if (!apiKey) throw new BadRequestException('API Key do Evolution não configurada');
    if (!webhookUrl) throw new BadRequestException('Webhook URL não configurada — preencha o campo e tente novamente');

    const url = `${baseUrl}/webhook/set/${encodeURIComponent(instanceName)}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ['MESSAGES_UPSERT'],
        }),
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new BadRequestException(data?.message || `Erro ao configurar webhook (${res.status})`);
      return data;
    } finally {
      clearTimeout(t);
    }
  }

  async sendText(input: { number: string; text: string }) {
    const baseUrl = this.normalizeBaseUrl(await this.config.getPlain(this.namespace, 'baseUrl'));
    const instanceName = (await this.config.getPlain(this.namespace, 'instanceName')).trim();
    const apiKey = (await this.config.getPlain(this.namespace, 'apiKey')).trim();

    if (!baseUrl) throw new BadRequestException('Base URL do Evolution não configurada');
    if (!instanceName) throw new BadRequestException('Instance Name do Evolution não configurado');
    if (!apiKey) throw new BadRequestException('API Key do Evolution não configurada');

    const url = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number: input.number, text: input.text }),
        signal: ac.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new BadRequestException(data?.message || `Erro ao enviar mensagem (${res.status})`);
      return data;
    } finally {
      clearTimeout(t);
    }
  }
}
