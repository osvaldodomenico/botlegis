import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TerritoriosService } from './territorios.service';
import { CreateTerritorioDto, UpdateTerritorioDto, ListTerritoriosDto } from './dto/territorio.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('territorios')
@UseGuards(JwtAuthGuard)
export class TerritoriosController {
  constructor(private service: TerritoriosService) {}

  @Get() list(@Query() q: ListTerritoriosDto) { return this.service.list(q); }
  @Get('por-municipio') findByMunicipio(@Query('nome') nome: string) { return this.service.findByNome(nome); }
  @Post() create(@Body() dto: CreateTerritorioDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateTerritorioDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
