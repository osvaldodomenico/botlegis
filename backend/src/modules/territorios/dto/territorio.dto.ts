import { IsString, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTerritorioDto {
  @IsString() @MaxLength(150)
  nome: string;

  @IsOptional() @IsString() rm_ra?: string;
  @IsOptional() @IsString() mesorregiao?: string;
  @IsOptional() @IsString() microrregiao?: string;
  @IsOptional() @IsString() divisao_regional?: string;
}

export class UpdateTerritorioDto extends CreateTerritorioDto {}

export class ListTerritoriosDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}
