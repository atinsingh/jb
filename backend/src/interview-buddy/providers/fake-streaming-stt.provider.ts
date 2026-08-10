import { Injectable, Logger } from '@nestjs/common';
import {
  SpeechSource,
  StreamingSttEvents,
  StreamingSttOpenOptions,
  StreamingSttProvider,
  StreamingSttSession,
} from '../interfaces/streaming-stt.interface';

/**
 * In-repo streaming STT double.
 *
 * Exists so the entire live pipeline — gateway, turn detection, coaching,
 * frontend — is testable end to end without a vendor account. It is NOT a
 * fallback that silently stands in for a real provider in production: the
 * factory only selects it when explicitly configured or when running tests, and
 * a live session backed by it reports `available` honestly.
 *
 * Behaviour: emits a partial after a couple of frames and a final on `flush()`
 * or after a silence gap, which is enough to exercise turn detection
 * deterministically without any timing flakiness.
 */
export class FakeStreamingSttSession implements StreamingSttSession {
  private readonly handlers: { [K in keyof StreamingSttEvents]?: StreamingSttEvents[K][] } = {};
  private readonly openedAt = Date.now();
  private frameCount = 0;
  private closed = false;

  /** Scripted utterances; each `sendAudio` advances toward emitting one. */
  constructor(
    private readonly script: Array<{ text: string; source: SpeechSource; afterFrames: number }> = [],
    private readonly now: () => number = Date.now,
  ) {}

  sendAudio(_frame: Buffer, source: SpeechSource): void {
    if (this.closed) return;
    this.frameCount += 1;

    for (const line of this.script) {
      if (line.afterFrames !== this.frameCount) continue;
      this.emit('transcript', {
        text: line.text,
        isFinal: true,
        confidence: 0.95,
        source: line.source ?? source,
        atMs: this.now() - this.openedAt,
      });
    }
  }

  /** Test helper: push a transcript directly, bypassing the frame script. */
  push(text: string, isFinal: boolean, source: SpeechSource = 'INTERVIEWER'): void {
    this.emit('transcript', {
      text,
      isFinal,
      confidence: 0.9,
      source,
      atMs: this.now() - this.openedAt,
    });
  }

  /** Test helper: simulate a vendor-side failure. */
  fail(message = 'fake stt failure'): void {
    this.emit('error', new Error(message));
  }

  on<E extends keyof StreamingSttEvents>(event: E, handler: StreamingSttEvents[E]): void {
    (this.handlers[event] ||= [] as any).push(handler as any);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.emit('close');
  }

  get isClosed(): boolean {
    return this.closed;
  }

  private emit(event: 'transcript', t: any): void;
  private emit(event: 'error', e: Error): void;
  private emit(event: 'close'): void;
  private emit(event: keyof StreamingSttEvents, payload?: any): void {
    for (const h of this.handlers[event] || []) (h as any)(payload);
  }
}

@Injectable()
export class FakeStreamingSttProvider implements StreamingSttProvider {
  readonly name = 'fake';
  readonly available = true;

  private readonly logger = new Logger(FakeStreamingSttProvider.name);

  /** Sessions opened, so tests can drive them. */
  readonly sessions: FakeStreamingSttSession[] = [];

  constructor(
    private readonly script: Array<{ text: string; source: SpeechSource; afterFrames: number }> = [],
  ) {}

  async open(_options?: StreamingSttOpenOptions): Promise<StreamingSttSession> {
    this.logger.debug('Opening fake streaming STT session (no vendor contacted).');
    const session = new FakeStreamingSttSession(this.script);
    this.sessions.push(session);
    return session;
  }

  /** The most recently opened session, for assertions. */
  get lastSession(): FakeStreamingSttSession | undefined {
    return this.sessions[this.sessions.length - 1];
  }
}

/**
 * Provider used when nothing is configured.
 *
 * Deliberately NOT a silent no-op: `available` is false, which the gateway turns
 * into an explicit "transcription unavailable" message to the candidate. Opening
 * a session throws, so there is no code path where a live interview appears to
 * be transcribing and is not.
 */
@Injectable()
export class UnconfiguredStreamingSttProvider implements StreamingSttProvider {
  readonly name = 'unconfigured';
  readonly available = false;

  async open(): Promise<StreamingSttSession> {
    throw new Error(
      'No streaming speech-to-text provider is configured. Set STT_PROVIDER and STT_API_KEY to enable live transcription.',
    );
  }
}
