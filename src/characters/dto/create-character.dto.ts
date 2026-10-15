import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min,} from 'class-validator';
import { CharacterStatus } from '../entities/character.entity';

export class CreateCharacterDto {
  @IsString()
  @Length(1, 100)
  realName: string;

  @IsString()
  @Length(1, 100)
  alias: string;

  @IsString()
  @Length(1, 150)
  mainPower: string;

  @IsInt()
  @Min(1)
  @Max(100)
  powerLevel: number;

  @IsOptional()
  @IsEnum(CharacterStatus)
  status?: CharacterStatus;

  @IsOptional()
  @IsBoolean()
  isVillain?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  teamId?: number | null;
}