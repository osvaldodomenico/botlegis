import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DobradaService } from './dobradas.service';
import { CreateDobradaDto, UpdateDobradaDto, ListDobradaDto } from './dto/dobrada.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dobradas')
@UseGuards(JwtAuthGuard)
export class DobradaController {
  constructor(private service: DobradaService) {}

  @Get() list(@Query() q: ListDobradaDto) { return this.service.list(q); }
  @Get('mapa-por-cidades') mapByCidades(@Query('cidades') cidades: string) { return this.service.mapByCidades(cidades); }
  @Get('por-cidade') findByCidade(@Query('cidade') cidade: string) { return this.service.findByCidade(cidade); }
  @Post() create(@Body() dto: CreateDobradaDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateDobradaDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
