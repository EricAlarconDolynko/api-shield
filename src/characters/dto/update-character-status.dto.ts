import { IsEnum } from 'class-validator';
import { CharacterStatus } from '../entities/character.entity';

export class UpdateCharacterStatusDto {
  @IsEnum(CharacterStatus)
  status: CharacterStatus;
}