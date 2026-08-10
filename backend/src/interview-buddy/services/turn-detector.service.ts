import { Injectable } from '@nestjs/common';
import { StreamingTranscript } from '../interfaces/streaming-stt.interface';

/**
 * Decides when the interviewer has finished asking something.
 *
 * This is the trigger for coaching, so its errors are asymmetric:
 *
 *   - Firing LATE is the worst outcome. The candidate has already started
 *     answering, and advice arriving mid-sentence competes for attention
 *     rather than helping.
 *   - Firing EARLY on a half-finished question produces advice about the wrong
 *     question, which is worse than none.
 *   - Firing on something that was not a question is cheap — the candidate
 *     glances at it and moves on.
 *
 * So the bias is: fire on a clear interrogative immediately, and otherwise fire
 * on silence rather than waiting for grammar that may never arrive. Real speech
 * is full of questions that never take interrogative form ("Walk me through
 * your last project.").
 *
 * Deliberately deterministic and model-free — a model call here would spend the
 * entire latency budget before coaching even starts.
 */

/** Silence after the interviewer stops that we treat as end-of-turn. */
const SILENCE_END_OF_TURN_MS = 900;

/** Ignore utterances too short to be a real question ("mm", "okay"). */
const MIN_QUESTION_CHARS = 8;

/** Openers that signal a question without a question mark. */
const INTERROGATIVE_OPENERS = [
  'what', 'why', 'how', 'when', 'where', 'which', 'who',
  'tell me', 'describe', 'walk me through', 'talk me through',
  'can you', 'could you', 'would you', 'will you',
  'do you', 'did you', 'have you', 'are you', 'is there',
  'give me', 'share an', 'share a', 'explain',
];

export interface DetectedQuestion {
  text: string;
  atMs: number;
  /** How the detector decided: useful for tuning and for logs. */
  via: 'question-mark' | 'interrogative' | 'silence';
}

@Injectable()
export class TurnDetectorService {
  /** Create per session — this holds per-conversation state. */
  createDetector(): TurnDetector {
    return new TurnDetector();
  }
}

export class TurnDetector {
  private buffer = '';
  private lastFinalAtMs: number | null = null;
  private lastFiredText = '';

  /**
   * Feed a transcript. Returns a question when one has just completed.
   *
   * Only the INTERVIEWER track is considered: the candidate's own speech is
   * their answer, and coaching on it would be coaching them on themselves.
   */
  ingest(t: StreamingTranscript): DetectedQuestion | null {
    if (t.source !== 'INTERVIEWER') return null;
    if (!t.isFinal) return null; // partials update the UI, never the trigger

    const text = String(t.text || '').trim();
    if (!text) return null;

    this.buffer = this.buffer ? `${this.buffer} ${text}` : text;
    this.lastFinalAtMs = t.atMs;

    const candidate = this.buffer.trim();
    if (candidate.length < MIN_QUESTION_CHARS) return null;

    if (candidate.endsWith('?')) return this.fire(candidate, t.atMs, 'question-mark');

    const lower = candidate.toLowerCase();
    if (INTERROGATIVE_OPENERS.some((o) => lower.startsWith(o))) {
      return this.fire(candidate, t.atMs, 'interrogative');
    }

    return null;
  }

  /**
   * Advance the clock. The gateway calls this on a short interval so a question
   * that never took interrogative form still fires once the interviewer stops
   * talking.
   */
  tick(nowMs: number): DetectedQuestion | null {
    if (this.lastFinalAtMs === null) return null;
    if (nowMs - this.lastFinalAtMs < SILENCE_END_OF_TURN_MS) return null;

    const candidate = this.buffer.trim();
    if (candidate.length < MIN_QUESTION_CHARS) {
      this.reset();
      return null;
    }

    return this.fire(candidate, nowMs, 'silence');
  }

  /** Called when the candidate starts answering — the turn is over. */
  reset(): void {
    this.buffer = '';
    this.lastFinalAtMs = null;
  }

  private fire(text: string, atMs: number, via: DetectedQuestion['via']): DetectedQuestion | null {
    // Guard against the same utterance firing twice — e.g. an interrogative
    // match immediately followed by the silence timer.
    if (text === this.lastFiredText) {
      this.reset();
      return null;
    }

    this.lastFiredText = text;
    this.reset();
    return { text, atMs, via };
  }
}
