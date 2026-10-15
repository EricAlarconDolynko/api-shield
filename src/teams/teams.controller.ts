import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put,} from '@nestjs/common';
import { AssignCharactersDto } from './dto/assign-characters.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { ReplaceTeamDto } from './dto/replace-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findOne(id);
  }

  @Get(':id/characters')
  findCharacters(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findCharacters(id);
  }

  @Post()
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Put(':id')
  replace(@Param('id', ParseIntPipe) id: number, @Body() dto: ReplaceTeamDto) {
    return this.teamsService.replace(id, dto);
  }

  @Patch(':id/characters')
  assignCharacters(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCharactersDto,
  ) {
    return this.teamsService.assignCharacters(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.remove(id);
  }
}