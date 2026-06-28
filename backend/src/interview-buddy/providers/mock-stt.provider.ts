import { Injectable } from '@nestjs/common';
import { STTProvider, STTResult, STTTranscriptSegment } from '../interfaces/stt-provider.interface';

@Injectable()
export class MockSTTProvider implements STTProvider {
  async transcribe(
    audioData: Buffer | string,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<STTResult> {
    // Simulate transcription delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return mock transcription
    const mockText = 'This is a mock transcription of the audio input.';
    const segments: STTTranscriptSegment[] = [
      {
        startMs: 0,
        endMs: 2000,
        text: mockText,
        confidence: 0.95,
        speaker: 'CANDIDATE',
      },
    ];

    return {
      text: mockText,
      segments,
      confidence: 0.95,
      language: options?.language || 'en',
    };
  }

  async transcribeStream(
    audioStream: any,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<AsyncIterable<STTResult>> {
    // Return an async generator wrapped in a promise
    const self = this;
    return (async function* () {
      // Mock streaming transcription
      const chunks = ['This is', ' a mock', ' transcription', ' of the audio input.'];
      
      for (let i = 0; i < chunks.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        yield {
          text: chunks.slice(0, i + 1).join(''),
          segments: [
            {
              startMs: i * 300,
              endMs: (i + 1) * 300,
              text: chunks[i],
              confidence: 0.9 + Math.random() * 0.1,
              speaker: 'CANDIDATE' as const,
            },
          ],
          confidence: 0.9,
          language: options?.language || 'en',
        };
      }
    })();
  }
}

