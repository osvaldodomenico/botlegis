import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { MunicipiosModule } from './modules/municipios/municipios.module';
import { ProjecoesModule } from './modules/projecoes/projecoes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ImportacoesModule } from './modules/importacoes/importacoes.module';
import { BuscaModule } from './modules/busca/busca.module';
import { TerritoriosModule } from './modules/territorios/territorios.module';
import { DobradaModule } from './modules/dobradas/dobradas.module';
import { IntegracoesModule } from './modules/integracoes/integracoes.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MunicipiosModule,
    ProjecoesModule,
    DashboardModule,
    ImportacoesModule,
    BuscaModule,
    TerritoriosModule,
    DobradaModule,
    IntegracoesModule,
  ],
})
export class AppModule {}
