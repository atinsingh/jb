import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Request,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerTalentService } from './employer-talent.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';

@ApiTags('employer-talent')
@ApiBearerAuth('JWT-auth')
@Controller('employer/talent-pool')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerTalentController {
  constructor(private readonly talentService: EmployerTalentService) {}

  @Get()
  @ApiOperation({ summary: 'List talent pool candidates with segment counts' })
  @ApiQuery({
    name: 'segment',
    required: false,
    description: 'Filter by segment (saved|silver|future|all)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive search over name/headline/skills',
  })
  @ApiResponse({ status: 200, description: 'Candidates retrieved successfully' })
  async list(
    @Query('segment') segment: string,
    @Query('search') search: string,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.talentService.list(ownerId, segment, search);
  }

  @Post()
  @ApiOperation({ summary: 'Add a candidate to the talent pool' })
  @ApiResponse({ status: 201, description: 'Candidate created successfully' })
  async create(@Body() dto: CreateCandidateDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.talentService.create(ownerId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a candidate from the talent pool' })
  @ApiParam({ name: 'id', description: 'Candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate removed successfully' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async remove(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.talentService.remove(ownerId, id);
  }
}
