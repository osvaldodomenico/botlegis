import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegracaoEvolutionService } from './integracao-evolution.service';
import { IntegracaoOpenAIService } from './integracao-openai.service';
import { IntegracaoBIService } from './integracao-bi.service';

@UseGuards(JwtAuthGuard)
@Controller('integracoes')
export class IntegracoesController {
  constructor(
    private evolution: IntegracaoEvolutionService,
    private openai: IntegracaoOpenAIService,
    private bi: IntegracaoBIService,
  ) {}

  @Get('evolution')
  getEvolution() {
    return this.evolution.getConfig();
  }

  @Put('evolution')
  saveEvolution(@Body() body: any) {
    return this.evolution.saveConfig({
      baseUrl: body?.baseUrl,
      instanceName: body?.instanceName,
      apiKey: body?.apiKey,
      webhookToken: body?.webhookToken,
    });
  }

  @Post('evolution/conectar')
  connectEvolution() {
    return this.evolution.connect();
  }

  @Post('evolution/configurar-webhook')
  configurarWebhookEvolution() {
    return this.evolution.configurarWebhook();
  }

  @Get('openai')
  getOpenAI() {
    return this.openai.getConfig();
  }

  @Put('openai')
  saveOpenAI(@Body() body: any) {
    return this.openai.saveConfig({
      model: body?.model,
      apiKey: body?.apiKey,
    });
  }

  @Get('bi')
  getBI() {
    return this.bi.getConfig();
  }

  @Put('bi')
  saveBI(@Body() body: any) {
    return this.bi.saveConfig({
      host: body?.host,
      port: body?.port,
      database: body?.database,
      user: body?.user,
      password: body?.password,
      table: body?.table,
      colMunicipio: body?.colMunicipio,
      colCandidato: body?.colCandidato,
      colVotos: body?.colVotos,
      colEleitores: body?.colEleitores,
      colValidos: body?.colValidos,
      colCargo: body?.colCargo,
      colUf: body?.colUf,
      colAno: body?.colAno,
      candidatoNome: body?.candidatoNome,
      cargo: body?.cargo,
      uf: body?.uf,
      ano: body?.ano,
    } as any);
  }

  @Post('bi/testar')
  testarBI() {
    return this.bi.testarConexao();
  }

  @Get('bi/milton-2022')
  async relatorioMilton2022(@Query('page') page?: string, @Query('limit') limit?: string, @Query('nome') nome?: string) {
    const all = await this.bi.buscarMiltonPorMunicipio();
    const safeLimit = Math.min(25, Math.max(1, Number(limit) || 25));
    const safePage = Math.max(1, Number(page) || 1);

    const filtered = nome
      ? all.filter(r => r.municipio.includes(String(nome || '').trim().toUpperCase()))
      : all;

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / safeLimit));
    const slice = filtered.slice((safePage - 1) * safeLimit, safePage * safeLimit);
    const data = slice.map(r => ({
      ...r,
      percentual_mv: r.validos_22 ? Number(((r.votos_22 / r.validos_22) * 100).toFixed(2)) : 0,
    }));

    return { data, meta: { total, page: safePage, limit: safeLimit, pages } };
  }
}
