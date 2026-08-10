import {
  Controller,
  Get,
  Post,
  Patch,
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
import { EmployerOffersService } from './employer-offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { UpdateOfferStatusDto } from './dto/update-offer-status.dto';

@ApiTags('employer-offers')
@Controller('employer/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerOffersController {
  constructor(private employerOffersService: EmployerOffersService) {}

  @Get('')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List employer offers' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  async findAll(@Query('status') status: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const offers = await this.employerOffersService.findAll(ownerId, status);
    return { offers, total: offers.length };
  }

  @Post('')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create an employer offer' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  async create(@Body() dto: CreateOfferDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const offer = await this.employerOffersService.create(ownerId, dto);
    return { offer };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an employer offer by ID' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const offer = await this.employerOffersService.findOne(ownerId, id);
    return { offer };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an employer offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer updated successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const offer = await this.employerOffersService.update(ownerId, id, dto);
    return { offer };
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an employer offer status' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer status updated successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOfferStatusDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const offer = await this.employerOffersService.updateStatus(
      ownerId,
      id,
      dto.status,
    );
    return { offer };
  }
}
