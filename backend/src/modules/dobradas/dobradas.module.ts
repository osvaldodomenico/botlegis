import { Module } from '@nestjs/common';
import { DobradaController } from './dobradas.controller';
import { DobradaService } from './dobradas.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DobradaController],
  providers: [DobradaService],
})
export class DobradaModule {}
