import { TurnDetectorService, TurnDetector } from './turn-detector.service';
import { StreamingTranscript } from '../interfaces/streaming-stt.interface';

const t = (
  text: string,
  over: Partial<StreamingTranscript> = {},
): StreamingTranscript => ({
  text,
  isFinal: true,
  confidence: 0.9,
  source: 'INTERVIEWER',
  atMs: 1000,
  ...over,
});

describe('TurnDetector', () => {
  let detector: TurnDetector;

  beforeEach(() => {
    detector = new TurnDetectorService().createDetector();
  });

  describe('what triggers coaching', () => {
    it('fires immediately on a question mark', () => {
      const q = detector.ingest(t('What was your hardest technical decision?'));

      expect(q).not.toBeNull();
      expect(q!.via).toBe('question-mark');
      expect(q!.text).toBe('What was your hardest technical decision?');
    });

    // Real interviewers ask plenty of questions that never take interrogative
    // form. Waiting for a '?' that never arrives would miss most of them.
    it('fires on an imperative that is really a question', () => {
      const q = detector.ingest(t('Walk me through your last project'));

      expect(q).not.toBeNull();
      expect(q!.via).toBe('interrogative');
    });

    it('recognises a range of natural openers', () => {
      for (const phrase of [
        'Tell me about a time you disagreed with someone',
        'How do you approach code review',
        'Describe your ideal working environment',
        'Can you give an example of a failure',
      ]) {
        const d = new TurnDetectorService().createDetector();
        expect(d.ingest(t(phrase))).not.toBeNull();
      }
    });

    it('fires on silence when the phrasing gave nothing away', () => {
      expect(detector.ingest(t("I'd like to hear about your background", { atMs: 1000 }))).toBeNull();

      // Still within the silence window.
      expect(detector.tick(1500)).toBeNull();

      const q = detector.tick(2200);
      expect(q).not.toBeNull();
      expect(q!.via).toBe('silence');
    });
  });

  describe('what must NOT trigger coaching', () => {
    it('ignores the candidate speaking', () => {
      expect(detector.ingest(t('What should I focus on?', { source: 'CANDIDATE' }))).toBeNull();
    });

    // Partials change constantly. Triggering on them would coach on a
    // half-heard question and burn the latency budget on the wrong thing.
    it('ignores partial transcripts', () => {
      expect(detector.ingest(t('What was your hardest', { isFinal: false }))).toBeNull();
    });

    it('ignores backchannel noise', () => {
      expect(detector.ingest(t('mm'))).toBeNull();
      expect(detector.ingest(t('okay'))).toBeNull();
    });

    it('ignores empty transcripts', () => {
      expect(detector.ingest(t('   '))).toBeNull();
    });

    it('does not fire twice for the same utterance', () => {
      const first = detector.ingest(t('Why do you want this role?', { atMs: 1000 }));
      expect(first).not.toBeNull();

      // The silence timer must not re-fire what already fired.
      expect(detector.tick(5000)).toBeNull();
    });
  });

  describe('multi-segment questions', () => {
    it('accumulates segments until the question completes', () => {
      expect(detector.ingest(t('So one thing I wanted to ask', { atMs: 1000 }))).toBeNull();

      const q = detector.ingest(t('is how you handled that outage?', { atMs: 1800 }));

      expect(q).not.toBeNull();
      expect(q!.text).toBe('So one thing I wanted to ask is how you handled that outage?');
    });

    it('starts clean after firing', () => {
      detector.ingest(t('Why this company?', { atMs: 1000 }));

      const q = detector.ingest(t('And what about the team?', { atMs: 4000 }));
      expect(q!.text).toBe('And what about the team?');
    });
  });

  describe('reset', () => {
    it('drops the buffer when the candidate starts answering', () => {
      detector.ingest(t('I was going to ask', { atMs: 1000 }));
      detector.reset();

      expect(detector.tick(9000)).toBeNull();
    });
  });
});
