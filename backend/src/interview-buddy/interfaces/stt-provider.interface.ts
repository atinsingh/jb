export interface STTTranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker?: 'INTERVIEWER' | 'CANDIDATE' | 'UNKNOWN';
}

export interface STTResult {
  text: string;
  segments: STTTranscriptSegment[];
  confidence: number;
  language?: string;
}

export interface STTProvider {
  /**
   * Transcribe audio stream (for real-time transcription)
   * @param audioStream - Audio stream (WebSocket, Buffer, or File)
   * @param options - Transcription options
   */
  transcribeStream?(
    audioStream: any,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<AsyncIterable<STTResult>>;

  /**
   * Transcribe audio file/buffer (batch mode)
   * @param audioData - Audio file buffer or path
   * @param options - Transcription options
   */
  transcribe(
    audioData: Buffer | string,
    options?: { language?: string; speakerDiarization?: boolean },
  ): Promise<STTResult>;
}

