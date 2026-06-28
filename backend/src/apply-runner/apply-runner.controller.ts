import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ApplyRunnerService } from './apply-runner.service';

@ApiTags('apply-runner')
@Controller('apply-runner')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ApplyRunnerController {
  constructor(private runner: ApplyRunnerService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process queued applications (stub runner)' })
  async process(@Body('limit') limit: number = 10) {
    const result = await this.runner.process(limit || 10);
    return { message: 'Processing complete', result };
  }
}
