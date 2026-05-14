import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDobradaDto {
  @IsString() @MaxLength(255)
  nome: string;

  @IsString() @MaxLength(150)
  cidade: string;

  @IsOptional() @IsInt() @Type(() => Number)
  projecao_votos?: number;
}

export class UpdateDobradaDto {
  @IsOptional() @IsString() @MaxLength(255) nome?: string;
  @IsOptional() @IsString() @MaxLength(150) cidade?: string;
  @IsOptional() @IsInt() @Type(() => Number) projecao_votos?: number;
}

export class ListDobradaDto {
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}
