import { BadRequestException, ConflictException, Injectable, NotFoundException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Character } from '../characters/entities/character.entity';
import { AssignCharactersDto } from './dto/assign-characters.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { ReplaceTeamDto } from './dto/replace-team.dto';
import { Team } from './entities/team.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(Character)
    private readonly charactersRepository: Repository<Character>,
  ) {}

  findAll(): Promise<Team[]> {
    return this.teamsRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Team> {
    const team = await this.teamsRepository.findOneBy({ id });
    if (!team) {
      throw new NotFoundException(`No existe un equipo con id ${id}, te la reviviste shaggy`);
    }
    return team;
  }

  async findCharacters(id: number): Promise<Character[]> {
    await this.findOne(id); 
    return this.charactersRepository.find({
      where: { teamId: id },
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    const { characterIds, ...teamData } = dto;

    if (characterIds?.length) {
      if (teamData.active === false) {
        throw new BadRequestException(
          'No se pueden asignar personajes a un equipo inactivo, duh :v',
        );
      }
      await this.ensureCharactersExist(characterIds);
    }

    const team = await this.persist(this.teamsRepository.create(teamData));

    if (characterIds?.length) {
      await this.charactersRepository.update(
        { id: In(characterIds) },
        { teamId: team.id },
      );
    }

    return this.findOne(team.id);
  }

  async replace(id: number, dto: ReplaceTeamDto): Promise<Team> {
    const current = await this.findOne(id);

    const replaced = this.teamsRepository.create({
      ...dto,
      id: current.id,
      base: dto.base ?? null,
      foundedYear: dto.foundedYear ?? null,
      active: dto.active ?? true,
    });
    return this.persist(replaced);
  }

  async assignCharacters(id: number, dto: AssignCharactersDto): Promise<Character[]> {
    const team = await this.findOne(id);
    if (!team.active) {
      throw new BadRequestException(`El equipo "${team.name}" está inactivo, pailis`);
    }

    await this.ensureCharactersExist(dto.characterIds);
    await this.charactersRepository.update(
      { id: In(dto.characterIds) },
      { teamId: team.id },
    );

    return this.findCharacters(team.id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);

    const assigned = await this.charactersRepository.countBy({ teamId: id });
    if (assigned > 0) {
      throw new ConflictException(
        `El equipo tiene ${assigned} personaje(s) asignado(s).Toco que le hagas Put :V`,
      );
    }

    await this.teamsRepository.delete(id);
  }

  private async ensureCharactersExist(ids: number[]): Promise<void> {
    const unique = [...new Set(ids)];
    const found = await this.charactersRepository.findBy({ id: In(unique) });

    if (found.length !== unique.length) {
      const encontrados = new Set(found.map((character) => character.id));
      const faltantes = unique.filter((id) => !encontrados.has(id));
      throw new NotFoundException(
        `No existen los personajes con id: ${faltantes.join(', ')}, te la reviviste shaggy`,
      );
    }
  }

  private async persist(team: Team): Promise<Team> {
    try {
      return await this.teamsRepository.save(team);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string }).code;
        if (code === PG_UNIQUE_VIOLATION) {
          throw new ConflictException(`Ya existe un equipo llamado "${team.name}", imagina que te ganen el nombre`);
        }
      }
      throw error;
    }
  }
}