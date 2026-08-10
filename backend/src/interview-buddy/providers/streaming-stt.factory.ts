import { Logger } from '@nestjs/common';
import { StreamingSttProvider } from '../interfaces/streaming-stt.interface';
import {
  FakeStreamingSttProvider,
  UnconfiguredStreamingSttProvider,
} from './fake-streaming-stt.provider';

/**
 * Choose the streaming speech-to-text provider from configuration.
 *
 * The default is UNCONFIGURED, not a working stand-in. That is the important
 * property: a deployment that forgets to set `STT_PROVIDER` gets a live session
 * that says "transcription is unavailable" rather than one that silently
 * transcribes nothing while looking healthy.
 *
 * `fake` is selectable on purpose — it drives the whole pipeline end to end in
 * tests and local development without a vendor account — but it announces
 * itself, so it can never be mistaken for real transcription in a log.
 */
export function createStreamingSttProvider(): StreamingSttProvider {
  const logger = new Logger('StreamingSttFactory');
  const kind = String(process.env.STT_PROVIDER || '').trim().toLowerCase();

  if (!kind) {
    logger.warn(
      'STT_PROVIDER is not set — live interview transcription is disabled. ' +
        'Live sessions will tell the candidate transcription is unavailable.',
    );
    return new UnconfiguredStreamingSttProvider();
  }

  if (kind === 'fake') {
    logger.warn('Using the FAKE streaming STT provider. No real transcription will occur.');
    return new FakeStreamingSttProvider();
  }

  // Real vendors (deepgram, assemblyai) plug in here. They are intentionally
  // not stubbed with a half-implementation: an adapter that pretends to stream
  // while batching would reintroduce exactly the latency problem this design
  // exists to solve. See the spec's dependency note — a vendor key is required.
  if (!process.env.STT_API_KEY) {
    logger.error(
      `STT_PROVIDER="${kind}" but STT_API_KEY is missing — transcription is disabled.`,
    );
    return new UnconfiguredStreamingSttProvider();
  }

  logger.error(
    `STT_PROVIDER="${kind}" is not implemented yet. Transcription is disabled rather than degraded silently.`,
  );
  return new UnconfiguredStreamingSttProvider();
}
