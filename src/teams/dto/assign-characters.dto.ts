import { ArrayNotEmpty, IsArray, IsInt, Min } from 'class-validator';

export class AssignCharactersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  characterIds: number[];
}