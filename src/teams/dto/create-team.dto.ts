import {IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min,} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 150)
  base?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  foundedYear?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  characterIds?: number[];
}