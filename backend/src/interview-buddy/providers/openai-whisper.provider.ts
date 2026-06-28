import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { STTProvider, STTResult, STTTranscriptSegment } from '../interfaces/stt-provider.interface';

@Injectable()
export class OpenAIWhisperBatchProvider implements STTProvider {
  private readonly logger = new Logger(OpenAIWhisperBatchProvider.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OpenAI API key not found. Whisper provider will not be available.');
    }
  }

  async transcribe(
    audioData: Buffer | string,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<STTResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // If audioData is a string (file path), read it as a file
      // Otherwise, treat it as a buffer
      let file: any;
      if (typeof audioData === 'string') {
        const fs = require('fs');
        file = await this.openai.files.create({
          file: fs.createReadStream(audioData),
          purpose: 'assistants',
        });
      } else {
        // Convert Buffer to Uint8Array for File constructor
        const uint8Array = new Uint8Array(audioData);
        file = new File([uint8Array], 'audio.webm', { type: 'audio/webm' });
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: file as any,
        model: 'whisper-1',
        language: options?.language || 'en',
        response_format: 'verbose_json',
      });

      // Convert OpenAI response to our format
      const segments: STTTranscriptSegment[] = (transcription as any).segments?.map(
        (seg: any) => ({
          startMs: Math.round(seg.start * 1000),
          endMs: Math.round(seg.end * 1000),
          text: seg.text,
          confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.9,
          speaker: 'UNKNOWN', // Whisper doesn't do speaker diarization by default
        }),
      ) || [
        {
          startMs: 0,
          endMs: Math.round((transcription as any).duration * 1000 || 0),
          text: transcription.text,
          confidence: 0.9,
          speaker: 'UNKNOWN',
        },
      ];

      return {
        text: transcription.text,
        segments,
        confidence: 0.9, // Whisper doesn't provide overall confidence
        language: options?.language || 'en',
      };
    } catch (error: any) {
      this.logger.error(`OpenAI Whisper transcription failed: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  // Note: OpenAI Whisper doesn't support streaming in the same way
  // This would need to be implemented with chunked audio processing
  async transcribeStream(
    audioStream: any,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<AsyncIterable<STTResult>> {
    // For now, fall back to batch mode
    // In production, you'd want to buffer chunks and call transcribe periodically
    this.logger.warn('Streaming transcription not fully implemented for Whisper. Using batch mode.');
    
    // Return an async generator wrapped in a promise
    const self = this;
    return (async function* () {
      // This is a placeholder - real implementation would buffer audio chunks
      yield await self.transcribe(audioStream, options);
    })();
  }
}

