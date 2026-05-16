import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesService } from './integracoes.service';
import { IntegracaoEvolutionService } from './integracao-evolution.service';
import { IntegracaoOpenAIService } from './integracao-openai.service';

@Module({
  imports: [PrismaModule],
  controllers: [IntegracoesController],
  providers: [IntegracoesService, IntegracaoEvolutionService, IntegracaoOpenAIService],
})
export class IntegracoesModule {}
