import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { BuscaService } from './busca.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class BuscaController {
  constructor(private service: BuscaService) {}

  // Busca full-text: GET /busca?q=campinas
  @Get('busca')
  buscar(@Query('q') q: string, @Query('limit') limit?: number) {
    return this.service.buscar(q, limit);
  }

  // Stats por região: GET /stats/regiao/LESTE
  @Get('stats/regiao/:regiao')
  statsPorRegiao(@Param('regiao') regiao: string) {
    return this.service.statsPorRegiao(regiao);
  }

  // Stats por bloco: GET /stats/bloco/CAMPINAS
  @Get('stats/bloco/:bloco')
  statsPorBloco(@Param('bloco') bloco: string) {
    return this.service.statsPorBloco(bloco);
  }

  // Busca por coordenador: GET /stats/coordenador/EDER
  @Get('stats/coordenador/:nome')
  municipiosPorCoordenador(@Param('nome') nome: string) {
    return this.service.municipiosPorCoordenador(nome);
  }

  // Ranking com filtros: GET /busca/ranking?regiao=LESTE&limit=10
  @Get('busca/ranking')
  ranking(@Query() query: any) {
    return this.service.ranking(query);
  }

  // Municípios sem coordenador: GET /stats/sem-coordenador
  @Get('stats/sem-coordenador')
  semCoordenador() {
    return this.service.semCoordenador();
  }

  // Opções para dropdowns: GET /filtros/opcoes
  @Get('filtros/opcoes')
  opcoesFiltros() {
    return this.service.opcoesFiltros();
  }
}
