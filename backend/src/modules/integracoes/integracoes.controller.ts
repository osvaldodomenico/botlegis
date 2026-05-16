import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntegracaoEvolutionService } from './integracao-evolution.service';
import { IntegracaoOpenAIService } from './integracao-openai.service';

@UseGuards(JwtAuthGuard)
@Controller('integracoes')
export class IntegracoesController {
  constructor(
    private evolution: IntegracaoEvolutionService,
    private openai: IntegracaoOpenAIService,
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
    });
  }

  @Post('evolution/conectar')
  connectEvolution() {
    return this.evolution.connect();
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
}
