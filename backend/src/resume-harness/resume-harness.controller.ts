import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import {
  ApplyVibeDto,
  RunTurnDto,
  SelectTemplateDto,
  StartSessionDto,
  RenameSessionDto,
} from './dto/resume-harness.dto';

/**
 * One harness-agnostic contract for LaTeX resume generation.
 *
 * The server chooses the harness from private provider metadata. The frontend
 * selects only model and effort, then talks to the same endpoints regardless
 * of which runtime was routed behind them.
 */
@ApiTags('resume-harness')
@ApiBearerAuth()
@Controller('resume-harness')
@UseGuards(JwtAuthGuard)
export class ResumeHarnessController {
  constructor(private readonly service: ResumeHarnessService) {}

  @Get('options')
  @ApiOperation({
    summary: 'Tier-permitted model and effort capabilities for this user',
  })
  options(@Request() req) {
    return this.service.options(this.userId(req));
  }

  /**
   * The seeded template catalogue.
   *
   * Not tier-filtered: a template is a layout, not a capability, and gating one
   * behind a plan would be a paywall on typography. What a plan buys is the
   * model that writes the words, which `options` already reports.
   */
  @Get('templates')
  @ApiOperation({
    summary: 'Predefined LaTeX templates, with previews and knobs',
  })
  templates() {
    return this.service.listTemplates();
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Start a session and provision its sandbox' })
  @ApiResponse({
    status: 400,
    description: 'Effort is unsupported by the model',
  })
  @ApiResponse({ status: 403, description: 'Model not permitted on this plan' })
  start(@Request() req, @Body() dto: StartSessionDto) {
    return this.service.startSession(this.userId(req), dto);
  }

  @Get('sessions')
  list(@Request() req) {
    return this.service.listSessions(this.userId(req));
  }

  @Patch('sessions/:id')
  rename(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RenameSessionDto,
  ) {
    return this.service.renameSession(this.userId(req), id, dto);
  }

  @Post('sessions/:id/revisions/:revision/restore')
  restore(
    @Request() req,
    @Param('id') id: string,
    @Param('revision', ParseIntPipe) revision: number,
  ) {
    return this.service.restoreRevision(this.userId(req), id, revision);
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
    this.sseHeaders(res);
    return this.stream(res, (send) =>
      this.service.runTurnStreaming(this.userId(req), id, dto, send),
    );
  }

  // -------------------------------------------------- template and vibe ---

  /**
   * Switch the résumé to a different template, carrying its content across.
   *
   * Unlike the harness, the template is not fixed for the life of a session:
   * nothing about the sandbox is rebound, so this is one turn against a
   * rewritten condition. The response is the session after the re-apply.
   */
  @Post('sessions/:id/template')
  @ApiOperation({ summary: 'Select a template and re-apply the résumé to it' })
  @ApiResponse({
    status: 404,
    description: 'No such template, or no such session',
  })
  @ApiResponse({ status: 409, description: 'The session has ended' })
  selectTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SelectTemplateDto,
  ) {
    return this.service.selectTemplate(this.userId(req), id, dto);
  }

  @Post('sessions/:id/template/stream')
  @ApiOperation({
    summary: 'Select a template, streaming the re-render as SSE',
  })
  async selectTemplateStream(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SelectTemplateDto,
    @Res() res: Response,
  ) {
    this.sseHeaders(res);
    return this.stream(res, (send) =>
      this.service.selectTemplate(this.userId(req), id, dto, send),
    );
  }

  /** Move the look dials on the current template, keeping the content. */
  @Post('sessions/:id/vibe')
  @ApiOperation({ summary: 'Apply a vibe change and re-render' })
  @ApiResponse({
    status: 400,
    description: 'A knob or value this template does not declare',
  })
  applyVibe(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApplyVibeDto,
  ) {
    return this.service.applyVibe(this.userId(req), id, dto);
  }

  @Post('sessions/:id/vibe/stream')
  @ApiOperation({
    summary: 'Apply a vibe change, streaming the re-render as SSE',
  })
  async applyVibeStream(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApplyVibeDto,
    @Res() res: Response,
  ) {
    this.sseHeaders(res);
    return this.stream(res, (send) =>
      this.service.applyVibe(this.userId(req), id, dto, send),
    );
  }

  /**
   * One step back to the look before the last change.
   *
   * Not streamed: it restores a stored revision without running the model.
   */
  @Post('sessions/:id/revert-look')
  @ApiOperation({
    summary: 'Restore the résumé as it was before the last look change',
  })
  @ApiResponse({
    status: 409,
    description: 'There is no previous look to restore',
  })
  revertLook(@Request() req, @Param('id') id: string) {
    return this.service.revertLook(this.userId(req), id);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End the session and release its sandbox' })
  end(@Request() req, @Param('id') id: string) {
    return this.service.endSession(this.userId(req), id);
  }

  @Post('sessions/:id/archive')
  @ApiOperation({ summary: 'Archive the generated résumé and its session' })
  archive(@Request() req, @Param('id') id: string) {
    return this.service.archiveSession(this.userId(req), id);
  }

  @Post('sessions/:id/restore')
  @ApiOperation({
    summary: 'Restore an archived résumé session to the library',
  })
  restoreSession(@Request() req, @Param('id') id: string) {
    return this.service.restoreSession(this.userId(req), id);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete the session and all its artifacts' })
  delete(@Request() req, @Param('id') id: string) {
    return this.service.deleteSession(this.userId(req), id);
  }

  // ------------------------------------------------------------ internals ---

  private sseHeaders(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Without this, a proxy in front of Nest may buffer the whole response and
    // defeat the point of streaming.
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  }

  /**
   * Runs one long operation with its progress on the wire.
   *
   * The error path writes an SSE `error` frame rather than setting a status
   * code: the headers went out when the stream opened, so a thrown exception
   * would reach the browser as a truncated body and the screen would show a
   * turn that never ended.
   */
  private async stream(
    res: Response,
    run: (send: (event: Record<string, unknown>) => void) => Promise<unknown>,
  ): Promise<void> {
    const send = (event: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      send({ type: 'result', session: await run(send) });
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

  private userId(req: any): string {
    return String(req.user._id ?? req.user.id);
  }
}
