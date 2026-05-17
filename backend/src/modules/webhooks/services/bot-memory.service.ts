import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type ContactMemory = {
  ultima_cidade: string | null;
  ultima_regiao: string | null;
  ultimo_topico: string | null;
  perfil: string | null;
};

@Injectable()
export class BotMemoryService {
  private readonly logger = new Logger(BotMemoryService.name);

  constructor(private prisma: PrismaService) {}

  private contatos() {
    return (this.prisma as any).botContato;
  }

  // ── Read memory ───────────────────────────────────────────────────────────

  async getMemory(contatoId: bigint): Promise<ContactMemory> {
    try {
      const contato = await this.contatos().findUnique({
        where: { id: contatoId },
        select: { ultima_cidade: true, ultima_regiao: true, ultimo_topico: true, perfil: true },
      });
      return contato ?? { ultima_cidade: null, ultima_regiao: null, ultimo_topico: null, perfil: null };
    } catch (e) {
      this.logger.warn(`Erro ao ler memória: ${e}`);
      return { ultima_cidade: null, ultima_regiao: null, ultimo_topico: null, perfil: null };
    }
  }

  // ── Write memory after each interaction ──────────────────────────────────

  async updateMemory(contatoId: bigint, data: Partial<ContactMemory>): Promise<void> {
    try {
      // Remove undefined values so we don't overwrite existing data with undefined
      const update = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
      if (Object.keys(update).length === 0) return;
      await this.contatos().update({ where: { id: contatoId }, data: update });
    } catch (e) {
      this.logger.warn(`Erro ao atualizar memória: ${e}`);
    }
  }

  // ── Detect what the user referenced and update accordingly ───────────────

  async updateFromSearchResult(contatoId: bigint, searchType: string, searchValue?: string): Promise<void> {
    if (!searchValue) return;

    const update: Partial<ContactMemory> = {};

    if (searchType === 'municipio') {
      update.ultima_cidade = searchValue;
      update.ultimo_topico = 'cidade';
    } else if (searchType === 'regiao') {
      update.ultima_regiao = searchValue;
      update.ultimo_topico = 'regiao';
    } else if (searchType === 'lideranca' || searchType === 'funcao_cargo') {
      update.ultimo_topico = 'lideranca';
    } else if (searchType === 'subdivisao') {
      update.ultimo_topico = 'subdivisao';
    }

    await this.updateMemory(contatoId, update);
  }

  // ── Get context hint for ambiguous queries like "e lá?" ──────────────────

  async getContextHint(contatoId: bigint): Promise<string | null> {
    const mem = await this.getMemory(contatoId);
    if (mem.ultima_cidade) return mem.ultima_cidade;
    if (mem.ultima_regiao) return mem.ultima_regiao;
    return null;
  }
}
