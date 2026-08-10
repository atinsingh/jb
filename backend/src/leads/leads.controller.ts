import { Body, Controller, Get, Headers, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LeadsService } from './leads.service';
import { CreateContactMessageDto, CreateDemoRequestDto } from './dto/create-lead.dto';
import { LeadKind } from './schemas/lead.schema';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Public marketing forms. Rate-limited because they are unauthenticated:
  // 5 submissions per minute per IP is far above genuine use and well below
  // what makes the endpoint worth abusing.
  @Post('demo')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a demo request from the public site' })
  async demo(
    @Body() dto: CreateDemoRequestDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    const { id } = await this.leadsService.create('demo', dto, { ip, userAgent, referer });
    return { ok: true, id };
  }

  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a contact message from the public site' })
  async contact(
    @Body() dto: CreateContactMessageDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    const { id } = await this.leadsService.create('contact', dto, { ip, userAgent, referer });
    return { ok: true, id };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiOperation({ summary: 'List inbound leads (admin)' })
  async list(@Query('kind') kind?: LeadKind, @Query('limit') limit?: string) {
    const leads = await this.leadsService.list(kind, limit ? parseInt(limit, 10) : 100);
    return { leads, total: leads.length };
  }
}
