import { OmitType } from '@nestjs/swagger';
import { CreateTeamDto } from './create-team.dto';

export class ReplaceTeamDto extends OmitType(CreateTeamDto, ['characterIds'] as const) {}