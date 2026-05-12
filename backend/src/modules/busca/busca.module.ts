import { Module } from '@nestjs/common';
import { BuscaService } from './busca.service';
import { BuscaController } from './busca.controller';

@Module({
  providers: [BuscaService],
  controllers: [BuscaController],
})
export class BuscaModule {}
