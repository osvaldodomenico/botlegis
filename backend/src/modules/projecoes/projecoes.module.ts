import { Module } from '@nestjs/common';
import { ProjecoesService } from './projecoes.service';
import { ProjecoesController } from './projecoes.controller';

@Module({
  providers: [ProjecoesService],
  controllers: [ProjecoesController],
})
export class ProjecoesModule {}
