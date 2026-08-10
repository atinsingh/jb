import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerCompanyService } from './employer-company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('employer-company')
@ApiBearerAuth('JWT-auth')
@Controller('employer/company')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerCompanyController {
  constructor(private readonly companyService: EmployerCompanyService) {}

  @Get()
  @ApiOperation({ summary: "Get the owner's company profile" })
  @ApiResponse({ status: 200, description: 'Company profile retrieved' })
  async get(@Request() req) {
    const ownerId = req.user._id.toString();
    const company = await this.companyService.getOrCreate(ownerId);
    return { company };
  }

  @Patch()
  @ApiOperation({ summary: 'Update the company profile' })
  @ApiResponse({ status: 200, description: 'Company profile updated' })
  async update(@Body() dto: UpdateCompanyDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const company = await this.companyService.update(ownerId, dto);
    return { company };
  }
}
