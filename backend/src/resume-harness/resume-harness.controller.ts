import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeHarnessService } from './resume-harness.service';
import { RunTurnDto, StartSessionDto } from './dto/resume-harness.dto';

/**
 * One harness-agnostic contract for LaTeX resume generation.
 *
 * The chosen harness changes what runs inside the sandbox and nothing about
 * these routes, which is the point: the frontend picks a harness at session
 * start and then talks to the same four endpoints regardless.
 */
@ApiTags('resume-harness')
@ApiBearerAuth()
@Controller('resume-harness')
@UseGuards(JwtAuthGuard)
export class ResumeHarnessController {
  constructor(private readonly service: ResumeHarnessService) {}

  @Get('options')
  @ApiOperation({
    summary: 'Harnesses and tier-permitted model+effort aliases for this user',
  })
  options(@Request() req) {
    return this.service.options(this.userId(req));
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Start a session and provision its sandbox' })
  @ApiResponse({ status: 403, description: 'Alias not permitted on this plan' })
  start(@Request() req, @Body() dto: StartSessionDto) {
    return this.service.startSession(this.userId(req), dto);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Current session state, LaTeX included' })
  get(@Request() req, @Param('id') id: string) {
    return this.service.getSession(this.userId(req), id);
  }

  @Get('sessions/:id/pdf')
  @ApiOperation({ summary: 'Compiled PDF for the current revision (base64)' })
  async pdf(@Request() req, @Param('id') id: string) {
    const pdfBase64 = await this.service.getPdf(this.userId(req), id);
    return { pdfBase64 };
  }

  @Post('sessions/:id/turns')
  @ApiOperation({
    summary: 'Create or update the resume — one instruction, one revision',
  })
  @ApiResponse({
    status: 409,
    description: 'Harness mismatch, or the session has ended',
  })
  turn(@Request() req, @Param('id') id: string, @Body() dto: RunTurnDto) {
    return this.service.runTurn(this.userId(req), id, dto);
  }

  /**
   * The same turn, as Server-Sent Events.
   *
   * A turn runs for tens of seconds. This streams the harness's own narration
   * and the phase it is in (writing → compiling → fixing) so the screen can
   * show work happening instead of a spinner, then sends the finished session
   * as a final `result` event.
   */
  @Post('sessions/:id/turns/stream')
  @ApiOperation({ summary: 'Create or update, streaming progress as SSE' })
  async turnStream(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RunTurnDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Without this, a proxy in front of Nest may buffer the whole response and
    // defeat the point of streaming.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const result = await this.service.runTurnStreaming(
        this.userId(req),
        id,
        dto,
        send,
      );
      send({ type: 'result', session: result });
    } catch (err: any) {
      send({
        type: 'error',
        status: err?.status ?? 500,
        message: err?.message ?? 'Turn failed',
      });
    } finally {
      res.end();
    }
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'End the session and release its sandbox' })
  end(@Request() req, @Param('id') id: string) {
    return this.service.endSession(this.userId(req), id);
  }

  private userId(req: any): string {
    return String(req.user._id ?? req.user.id);
  }
}
