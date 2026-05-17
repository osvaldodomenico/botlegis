import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

type Row = {
  id: bigint;
  namespace: string;
  chave: string;
  valor: string;
  criptografado: boolean;
};

@Injectable()
export class IntegracoesService {
  constructor(private prisma: PrismaService) {}

  private getSecret() {
    return process.env.INTEGRACOES_SECRET || process.env.JWT_SECRET || '';
  }

  private keyFromSecret(secret: string) {
    return crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plainText: string) {
    const secret = this.getSecret();
    if (!secret) return { valor: plainText, criptografado: false };

    const key = this.keyFromSecret(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const valor = `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
    return { valor, criptografado: true };
  }

  decrypt(valor: string, criptografado: boolean) {
    if (!criptografado) return valor;
    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('INTEGRACOES_SECRET não configurado');

    const [ivB64, tagB64, dataB64] = (valor || '').split('.');
    if (!ivB64 || !tagB64 || !dataB64) throw new BadRequestException('Segredo inválido');

    const key = this.keyFromSecret(secret);
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private model() {
    return (this.prisma as any).integracaoConfiguracao;
  }

  async get(namespace: string, chave: string): Promise<Row | null> {
    const row = await this.model().findFirst({ where: { namespace, chave } });
    return row || null;
  }

  async upsert(namespace: string, chave: string, plainText: string, criptografar: boolean) {
    const payload = criptografar ? this.encrypt(plainText) : { valor: plainText, criptografado: false };
    const row = await this.model().upsert({
      where: { namespace_chave: { namespace, chave } },
      update: payload,
      create: { namespace, chave, ...payload },
    });
    return row as Row;
  }

  async getPlain(namespace: string, chave: string) {
    const row = await this.get(namespace, chave);
    if (!row) return '';
    return this.decrypt(row.valor, row.criptografado);
  }
}
