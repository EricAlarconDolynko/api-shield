import {BadRequestException, ConflictException, Injectable, NotFoundException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity';
import { CreateCharacterDto } from './dto/create-character.dto';
import { QueryCharactersDto } from './dto/query-character.dto';
import { UpdateCharacterStatusDto } from './dto/update-character-status.dto';
import { Character, CharacterStatus } from './entities/character.entity';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const DEFAULT_LIMIT = 20;

@Injectable()
export class CharactersService {
  constructor(
    @InjectRepository(Character)
    private readonly charactersRepository: Repository<Character>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async findAll(query: QueryCharactersDto) {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;

    const where: FindOptionsWhere<Character> = {};
    if (query.status !== undefined) where.status = query.status;
    if (query.teamId !== undefined) where.teamId = query.teamId;

    const [data, total] = await this.charactersRepository.findAndCount({
      where,
      relations: { team: true },
      order: { id: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { data, total, limit, offset };
  }

  async findOne(id: number): Promise<Character> {
    const character = await this.charactersRepository.findOne({
      where: { id },
      relations: { team: true },
    });
    if (!character) {
      throw new NotFoundException(`No existe un personaje con id ${id}, es que también te pasas`);
    }
    return character;
  }

  async create(dto: CreateCharacterDto): Promise<Character> {
    await this.ensureTeamIsAssignable(dto.teamId);
    return this.persist(this.charactersRepository.create(dto));
  }

  async replace(id: number, dto: CreateCharacterDto): Promise<Character> {
    const current = await this.findOne(id);
    await this.ensureTeamIsAssignable(dto.teamId);

    const nextStatus = dto.status ?? CharacterStatus.ACTIVE;
    this.ensureStatusTransition(current.status, nextStatus);

    const replaced = this.charactersRepository.create({
      ...dto,
      id: current.id,
      status: nextStatus,
      isVillain: dto.isVillain ?? false,
      teamId: dto.teamId ?? null,
    });
    return this.persist(replaced);
  }

  async changeStatus(id: number, dto: UpdateCharacterStatusDto): Promise<Character> {
    const character = await this.findOne(id);
    this.ensureStatusTransition(character.status, dto.status);
    character.status = dto.status;
    return this.persist(character);
  }

  async remove(id: number): Promise<void> {
    const result = await this.charactersRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`No existe un personaje con id ${id}, miami me lo confirmó`);
    }
  }

  private async ensureTeamIsAssignable(teamId?: number | null): Promise<void> {
    if (teamId === undefined || teamId === null) return;

    const team = await this.teamsRepository.findOneBy({ id: teamId });
    if (!team) {
      throw new NotFoundException(`No existe el equipo con id ${teamId}, o donde escuchaste ese id :v`);
    }
    if (!team.active) {
      throw new BadRequestException(`El equipo "${team.name}" está inactivo`);
    }
  }

  private ensureStatusTransition(current: CharacterStatus, next: CharacterStatus): void {
    if (current === CharacterStatus.RETIRED && next === CharacterStatus.INJURED) {
      throw new BadRequestException(
        'Mi pana un personaje RETIRED no puede pasar directamente a INJURED :v',
      );
    }
  }

  private async persist(character: Character): Promise<Character> {
    try {
      return await this.charactersRepository.save(character);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string }).code;
        if (code === PG_UNIQUE_VIOLATION) {
          throw new ConflictException(`El alias "${character.alias}" ya está usado, te ganaron ajsdjasjdajsd`);
        }
        if (code === PG_FOREIGN_KEY_VIOLATION) {
          throw new ConflictException(`No existe el equipo con id ${character.teamId}, te falta leer 100 años de seriedad`);
        }
      }
      throw error; 
    }
  }
}