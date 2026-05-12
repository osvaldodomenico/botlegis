import { IsString, IsOptional, IsInt, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMunicipioDto {
  @IsString()
  @MaxLength(150)
  nome: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  bloco?: string;

  @IsOptional()
  @IsString()
  regiao?: string;

  @IsOptional()
  @IsString()
  rm_ra?: string;

  @IsOptional()
  @IsString()
  mesorregiao?: string;

  @IsOptional()
  @IsString()
  microrregiao?: string;

  @IsOptional()
  @IsString()
  divisao_regional?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  projecao_votos?: number;

  @IsOptional()
  @IsString()
  coordenacao?: string;

  @IsOptional()
  @IsString()
  lideranca?: string;

  @IsOptional()
  @IsString()
  funcao_cargo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projecao_2?: number;

  @IsOptional()
  @IsString()
  coord_lideranca_2?: string;

  @IsOptional()
  @IsString()
  funcao_cargo_2?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projecao_apoio_iurd?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  projecao_base?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  eleitores_22?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  votos_validos_22?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  percentual_mv?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  votos_22?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  percentual_perda?: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateMunicipioDto extends CreateMunicipioDto {}

export class ListMunicipiosDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  regiao?: string;

  @IsOptional()
  @IsString()
  bloco?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  orderBy?: string = 'nome';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';
}
