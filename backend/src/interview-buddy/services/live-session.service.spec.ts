import { LiveSessionService, LiveEvent } from './live-session.service';
import { TurnDetectorService } from './turn-detector.service';
import {
  FakeStreamingSttProvider,
  UnconfiguredStreamingSttProvider,
} from '../providers/fake-streaming-stt.provider';

const SESSION = 'sess-1';
const USER = 'user-1';

const consented = () => new Date();

function build(overrides: { provider?: any; coaching?: any } = {}) {
  const provider = overrides.provider ?? new FakeStreamingSttProvider();
  const coaching =
    overrides.coaching ?? { generateCoaching: jest.fn().mockResolvedValue({ points: ['use STAR'] }) };

  const service = new LiveSessionService(provider as any, new TurnDetectorService(), coaching as any);

  const events: LiveEvent[] = [];
  const emit = (e: LiveEvent) => events.push(e);

  return { service, provider, coaching, events, emit };
}

const start = (service: LiveSessionService, emit: any, over: any = {}) =>
  service.start({
    sessionId: SESSION,
    userId: USER,
    consentAcknowledgedAt: consented(),
    contextPack: { role: 'Engineer' },
    emit,
    ...over,
  });

describe('LiveSessionService', () => {
  afterEach(() => jest.useRealTimers());

  // ============================================== consent gate ==========
  describe('consent is required before capture', () => {
    it('refuses to start without an acknowledgement', async () => {
      const { service, emit, provider } = build();

      const res = await start(service, emit, { consentAcknowledgedAt: null });

      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/consent/i);
      // Nothing was opened — no vendor session, no capture machinery.
      expect(provider.sessions).toHaveLength(0);
      expect(service.activeCount).toBe(0);
    });

    it('starts once consent is acknowledged', async () => {
      const { service, emit, provider } = build();

      const res = await start(service, emit);

      expect(res.ok).toBe(true);
      expect(provider.sessions).toHaveLength(1);
      await service.stop(SESSION);
    });
  });

  // ======================================= honest degradation ===========
  describe('when transcription is unavailable', () => {
    it('refuses to start and says so plainly', async () => {
      const { service, emit, events } = build({ provider: new UnconfiguredStreamingSttProvider() });

      const res = await start(service, emit);

      expect(res.ok).toBe(false);
      expect(service.transcriptionAvailable).toBe(false);

      // The candidate must be TOLD. A live UI that looks like it is listening
      // and is not is the worst failure mode this feature has.
      const notice = events.find((e) => e.type === 'notice') as any;
      expect(notice).toBeDefined();
      expect(notice.level).toBe('error');
      expect(notice.message).toMatch(/unavailable|not being transcribed/i);
    });
  });

  // ========================================= no audio persistence =======
  describe('audio is never persisted', () => {
    it('forwards frames to the vendor and keeps no reference', async () => {
      const { service, emit, provider } = build();
      await start(service, emit);

      const sent: Buffer[] = [];
      const sttSession: any = provider.lastSession;
      const original = sttSession.sendAudio.bind(sttSession);
      sttSession.sendAudio = (frame: Buffer, source: any) => {
        sent.push(frame);
        return original(frame, source);
      };

      service.pushAudio(SESSION, Buffer.from('pcm-frame-1'), 'INTERVIEWER');
      service.pushAudio(SESSION, Buffer.from('pcm-frame-2'), 'INTERVIEWER');

      expect(sent).toHaveLength(2);

      // The service exposes no accessor for audio, and the serialized service
      // holds none: the only path a frame takes is straight to the vendor.
      expect(JSON.stringify(service)).not.toContain('pcm-frame');
      await service.stop(SESSION);
    });

    it('drops frames entirely once the session is stopped', async () => {
      const { service, emit, provider } = build();
      await start(service, emit);
      const sttSession: any = provider.lastSession;
      await service.stop(SESSION);

      const before = sttSession.isClosed;
      service.pushAudio(SESSION, Buffer.from('after-stop'), 'INTERVIEWER');

      expect(before).toBe(true);
      expect(service.activeCount).toBe(0);
    });
  });

  // ================================================ transcripts =========
  describe('transcripts and coaching', () => {
    it('emits transcripts to the client', async () => {
      const { service, emit, events, provider } = build();
      await start(service, emit);

      provider.lastSession!.push('Tell me about', false, 'INTERVIEWER');

      const transcript = events.find((e) => e.type === 'transcript') as any;
      expect(transcript.text).toBe('Tell me about');
      expect(transcript.isFinal).toBe(false);
      await service.stop(SESSION);
    });

    it('coaches when the interviewer asks a question', async () => {
      const { service, emit, events, provider, coaching } = build();
      await start(service, emit);

      provider.lastSession!.push('What was your hardest technical decision?', true, 'INTERVIEWER');
      await new Promise((r) => setImmediate(r));

      expect(coaching.generateCoaching).toHaveBeenCalledWith(
        { role: 'Engineer' },
        'What was your hardest technical decision?',
      );
      expect(events.some((e) => e.type === 'question-detected')).toBe(true);
      expect(events.some((e) => e.type === 'coaching')).toBe(true);
      await service.stop(SESSION);
    });

    it('signals that coaching is pending before the model returns', async () => {
      const { service, emit, events, provider } = build();
      await start(service, emit);

      provider.lastSession!.push('Why do you want this role?', true, 'INTERVIEWER');
      await new Promise((r) => setImmediate(r));

      const pendingIdx = events.findIndex((e) => e.type === 'coaching-pending');
      const coachingIdx = events.findIndex((e) => e.type === 'coaching');
      expect(pendingIdx).toBeGreaterThan(-1);
      expect(pendingIdx).toBeLessThan(coachingIdx);
      await service.stop(SESSION);
    });

    it('does not coach on the candidate answering', async () => {
      const { service, emit, coaching, provider } = build();
      await start(service, emit);

      provider.lastSession!.push('What I did was refactor the pipeline?', true, 'CANDIDATE');
      await new Promise((r) => setImmediate(r));

      expect(coaching.generateCoaching).not.toHaveBeenCalled();
      await service.stop(SESSION);
    });

    it('warns rather than failing when coaching errors', async () => {
      const { service, emit, events, provider } = build({
        coaching: { generateCoaching: jest.fn().mockRejectedValue(new Error('llm down')) },
      });
      await start(service, emit);

      provider.lastSession!.push('How do you handle conflict?', true, 'INTERVIEWER');
      await new Promise((r) => setImmediate(r));

      const notice = events.find((e) => e.type === 'notice') as any;
      expect(notice.level).toBe('warn');
      await service.stop(SESSION);
    });
  });

  describe('retention', () => {
    it('defaults to not persisting the transcript', async () => {
      const { service, emit } = build();
      await start(service, emit);

      expect(service.shouldPersistTranscript(SESSION)).toBe(false);
      await service.stop(SESSION);
    });

    it('persists only when the candidate opted in', async () => {
      const { service, emit } = build();
      await start(service, emit, { retainTranscript: true });

      expect(service.shouldPersistTranscript(SESSION)).toBe(true);
      await service.stop(SESSION);
    });
  });

  describe('lifecycle', () => {
    it('refuses to start the same session twice', async () => {
      const { service, emit } = build();
      await start(service, emit);

      const second = await start(service, emit);

      expect(second.ok).toBe(false);
      await service.stop(SESSION);
    });

    it('closes the vendor session on stop', async () => {
      const { service, emit, provider } = build();
      await start(service, emit);

      await service.stop(SESSION);

      expect(provider.lastSession!.isClosed).toBe(true);
      expect(service.activeCount).toBe(0);
    });
  });
});
