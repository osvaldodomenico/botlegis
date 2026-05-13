import { Module } from '@nestjs/common';
import { TerritoriosController } from './territorios.controller';
import { TerritoriosService } from './territorios.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TerritoriosController],
  providers: [TerritoriosService],
})
export class TerritoriosModule {}
