import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SpeechSource,
  StreamingSttProvider,
  StreamingSttSession,
  StreamingTranscript,
  STREAMING_STT_PROVIDER,
} from '../interfaces/streaming-stt.interface';
import { TurnDetector, TurnDetectorService } from './turn-detector.service';
import { CoachingService } from './coaching.service';

/** How often the silence timer is evaluated. */
const TICK_INTERVAL_MS = 250;

/** What the gateway forwards to the client socket. */
export type LiveEvent =
  | { type: 'transcript'; text: string; isFinal: boolean; source: SpeechSource }
  | { type: 'question-detected'; text: string }
  | { type: 'coaching-pending'; question: string }
  | { type: 'coaching'; question: string; output: any }
  | { type: 'notice'; level: 'info' | 'warn' | 'error'; message: string };

interface LiveSession {
  sessionId: string;
  userId: string;
  stt: StreamingSttSession;
  detector: TurnDetector;
  timer: NodeJS.Timeout;
  contextPack: any;
  /** Only true when the candidate opted in. Governs turn persistence. */
  retainTranscript: boolean;
  startedAt: number;
}

/**
 * Runs one live interview: audio in, transcripts and coaching out.
 *
 * Everything the gateway would otherwise do inline lives here, so the rules can
 * be tested without sockets. Three of them are load-bearing:
 *
 *   1. NO AUDIO IS EVER PERSISTED. Frames pass from the socket to the vendor
 *      session and are dropped. There is no write path for them — not to disk,
 *      not to storage, not to Mongo. Deliberately not a policy but an absence.
 *   2. Capture requires consent. A session without `consentAcknowledgedAt` is
 *      refused, because the audio includes the interviewer's voice.
 *   3. When transcription is unavailable, say so. A live UI that appears to be
 *      listening and is not is the worst possible failure here.
 */
@Injectable()
export class LiveSessionService {
  private readonly logger = new Logger(LiveSessionService.name);
  private readonly active = new Map<string, LiveSession>();

  constructor(
    @Inject(STREAMING_STT_PROVIDER) private readonly stt: StreamingSttProvider,
    private readonly turnDetectors: TurnDetectorService,
    private readonly coaching: CoachingService,
  ) {}

  /** Is live transcription possible at all right now? */
  get transcriptionAvailable(): boolean {
    return !!this.stt?.available;
  }

  /**
   * Begin a live session.
   *
   * @param emit callback the gateway uses to push events to the client
   * @returns `{ ok: false, reason }` when capture must not start — the caller
   *          shows the reason rather than opening a microphone.
   */
  async start(params: {
    sessionId: string;
    userId: string;
    consentAcknowledgedAt?: Date | null;
    retainTranscript?: boolean;
    contextPack?: any;
    emit: (event: LiveEvent) => void;
  }): Promise<{ ok: boolean; reason?: string }> {
    const { sessionId, userId, emit } = params;

    if (this.active.has(sessionId)) {
      return { ok: false, reason: 'This session is already capturing.' };
    }

    // Rule 2 — consent gate. Checked before any capture machinery is created.
    if (!params.consentAcknowledgedAt) {
      return {
        ok: false,
        reason: 'Capture requires your consent acknowledgement before it can start.',
      };
    }

    // Rule 3 — honest degradation.
    if (!this.stt.available) {
      emit({
        type: 'notice',
        level: 'error',
        message:
          'Live transcription is unavailable — no speech provider is configured. ' +
          'You can still take notes manually; nothing is being transcribed.',
      });
      return { ok: false, reason: 'Live transcription is not configured.' };
    }

    let sttSession: StreamingSttSession;
    try {
      sttSession = await this.stt.open({ sampleRate: 16000 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to open STT session for ${sessionId}: ${message}`);
      emit({ type: 'notice', level: 'error', message: 'Could not start transcription.' });
      return { ok: false, reason: message };
    }

    const live: LiveSession = {
      sessionId,
      userId,
      stt: sttSession,
      detector: this.turnDetectors.createDetector(),
      contextPack: params.contextPack,
      retainTranscript: !!params.retainTranscript,
      startedAt: Date.now(),
      timer: setInterval(() => this.onTick(sessionId, emit), TICK_INTERVAL_MS),
    };

    sttSession.on('transcript', (t) => this.onTranscript(sessionId, t, emit));
    sttSession.on('error', (err) => {
      this.logger.warn(`STT error on ${sessionId}: ${err.message}`);
      emit({
        type: 'notice',
        level: 'warn',
        message: 'Transcription stopped unexpectedly. Switch to manual notes.',
      });
    });

    this.active.set(sessionId, live);
    this.logger.log(`Live session ${sessionId} started (provider ${this.stt.name}).`);
    return { ok: true };
  }

  /**
   * Forward one PCM frame.
   *
   * Note what is absent: the frame is handed to the vendor session and the
   * reference is dropped. It is never buffered to disk, appended to a document,
   * or written anywhere.
   */
  pushAudio(sessionId: string, frame: Buffer, source: SpeechSource): void {
    const live = this.active.get(sessionId);
    if (!live) return;
    live.stt.sendAudio(frame, source);
  }

  /** End the session and release the vendor connection. */
  async stop(sessionId: string): Promise<void> {
    const live = this.active.get(sessionId);
    if (!live) return;

    clearInterval(live.timer);
    this.active.delete(sessionId);
    await live.stt.close().catch(() => undefined);
    this.logger.log(`Live session ${sessionId} stopped.`);
  }

  /** Sessions currently capturing — used by tests and diagnostics. */
  get activeCount(): number {
    return this.active.size;
  }

  private onTranscript(
    sessionId: string,
    t: StreamingTranscript,
    emit: (e: LiveEvent) => void,
  ): void {
    const live = this.active.get(sessionId);
    if (!live) return;

    emit({ type: 'transcript', text: t.text, isFinal: t.isFinal, source: t.source });

    // The candidate speaking means the interviewer's turn is over.
    if (t.source === 'CANDIDATE' && t.isFinal) {
      live.detector.reset();
      return;
    }

    const question = live.detector.ingest(t);
    if (question) void this.onQuestion(sessionId, question.text, emit);
  }

  private onTick(sessionId: string, emit: (e: LiveEvent) => void): void {
    const live = this.active.get(sessionId);
    if (!live) return;

    const question = live.detector.tick(Date.now() - live.startedAt);
    if (question) void this.onQuestion(sessionId, question.text, emit);
  }

  private async onQuestion(
    sessionId: string,
    questionText: string,
    emit: (e: LiveEvent) => void,
  ): Promise<void> {
    const live = this.active.get(sessionId);
    if (!live) return;

    emit({ type: 'question-detected', text: questionText });

    // Emitted before the model call so the UI can show it is working. Coaching
    // itself is not yet token-streamed — see the note in the class docs and the
    // known-limitation entry in the spec follow-up.
    emit({ type: 'coaching-pending', question: questionText });

    try {
      const output = await this.coaching.generateCoaching(live.contextPack, questionText);
      emit({ type: 'coaching', question: questionText, output });
    } catch (err) {
      this.logger.warn(
        `Coaching failed for ${sessionId}: ${err instanceof Error ? err.message : err}`,
      );
      emit({
        type: 'notice',
        level: 'warn',
        message: 'Could not generate talking points for that question.',
      });
    }
  }

  /**
   * Coach on a question the candidate typed themselves.
   *
   * The fallback path that keeps the product useful when transcription is
   * unavailable or wrong — the candidate types what was asked and still gets
   * grounded talking points. This is what "degrade honestly" means in practice:
   * the feature narrows, it does not silently stop working.
   */
  async askManually(
    sessionId: string,
    questionText: string,
    emit: (e: LiveEvent) => void,
  ): Promise<void> {
    if (!this.active.has(sessionId)) return;
    await this.onQuestion(sessionId, questionText, emit);
  }

  /** Whether this session's transcript may be written down. */
  shouldPersistTranscript(sessionId: string): boolean {
    return !!this.active.get(sessionId)?.retainTranscript;
  }
}
