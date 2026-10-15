import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CharacterStatus } from '../entities/character.entity';

export class QueryCharactersDto {
  @IsOptional()
  @IsEnum(CharacterStatus)
  status?: CharacterStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  teamId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}