/**
 * Streaming speech-to-text contract.
 *
 * The existing `STTProvider` is batch-shaped: hand it a buffer, await a result.
 * That is the wrong shape for a live copilot, where the value is entirely in
 * partial results arriving WHILE the interviewer is still speaking. A pull-based
 * `AsyncIterable` has the same problem — it makes the consumer wait.
 *
 * So this is push-based and session-oriented: open a session, feed it frames,
 * receive events. `STTProvider` stays as it is for batch work.
 *
 * NOTE ON AUDIO RETENTION: implementations must NOT write frames to disk, to a
 * database, or to any store. Frames go to the vendor socket and are dropped.
 * There is no audio persistence anywhere in this feature, by construction.
 */

/** Who produced this speech. Derived from the track, not from diarisation. */
export type SpeechSource = 'INTERVIEWER' | 'CANDIDATE';

export interface StreamingTranscript {
  /** Text so far. For a partial this will change; for a final it will not. */
  text: string;
  /** True once the provider considers this utterance settled. */
  isFinal: boolean;
  /** 0..1 provider confidence, when it reports one. */
  confidence?: number;
  /** Which track this came from. */
  source: SpeechSource;
  /** Milliseconds since the session opened. */
  atMs: number;
}

export interface StreamingSttEvents {
  transcript: (t: StreamingTranscript) => void;
  error: (err: Error) => void;
  close: () => void;
}

/** One live transcription session, typically one vendor socket. */
export interface StreamingSttSession {
  /**
   * Push one PCM frame (16kHz mono, ~100ms). Fire-and-forget: this must never
   * block the gateway's event loop waiting on the vendor.
   */
  sendAudio(frame: Buffer, source: SpeechSource): void;

  on<E extends keyof StreamingSttEvents>(event: E, handler: StreamingSttEvents[E]): void;

  /** Close the vendor connection and release everything. Always safe to call. */
  close(): Promise<void>;
}

export interface StreamingSttOpenOptions {
  language?: string;
  /** Audio sample rate; the gateway always sends 16kHz. */
  sampleRate?: number;
}

export interface StreamingSttProvider {
  /** For logs and for telling the candidate what is transcribing them. */
  readonly name: string;

  /**
   * False when the provider has no credentials or is otherwise unusable.
   *
   * This exists so the product can degrade HONESTLY. A live session with no
   * transcription must tell the candidate that transcription is unavailable —
   * never present a UI that looks like it is working while silently doing
   * nothing, which is the failure mode this whole feature is meant to avoid.
   */
  readonly available: boolean;

  open(options?: StreamingSttOpenOptions): Promise<StreamingSttSession>;
}

/** Injection token for the configured streaming provider. */
export const STREAMING_STT_PROVIDER = 'STREAMING_STT_PROVIDER';
