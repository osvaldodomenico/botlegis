import { Controller, Get, Put, Param, Body, Query, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { ProjecoesService } from './projecoes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateProjecaoDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  projecao_votos: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('projecoes')
export class ProjecoesController {
  constructor(private service: ProjecoesService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjecaoDto, @Request() req: any) {
    return this.service.update(id, dto, req.user.email);
  }

  @Get(':id/historico')
  historico(@Param('id', ParseIntPipe) id: number) {
    return this.service.historico(id);
  }
}
