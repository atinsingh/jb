import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InterviewBuddyService } from '../interview-buddy.service';
import { LiveSessionService } from '../services/live-session.service';
import type { SpeechSource } from '../interfaces/streaming-stt.interface';
import { corsOrigins } from '../../common/config/cors-origins';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

/**
 * Audio transport for the live interview copilot.
 *
 * Deliberately thin: it authenticates, authorises, and moves bytes. Every rule
 * that matters — consent, retention, "raw audio is never persisted", honest
 * degradation when transcription is unconfigured — lives in
 * {@link LiveSessionService}, where it is unit-tested without sockets.
 *
 * SECURITY: an unauthenticated socket that accepted frames would be an open
 * transcription relay billed to us, so both the JWT and session ownership are
 * verified before a single frame is taken.
 *
 * AUDIO RETENTION: frames pass through `pushAudio` to the vendor and the
 * reference is dropped. There is no code path here that writes audio anywhere.
 */
@WebSocketGateway({
  namespace: '/interview-sessions',
  cors: {
    // Same allowlist as the HTTP API: a browser connecting from an allowed
    // origin must not be rejected at the websocket layer instead.
    origin: corsOrigins(),
    credentials: true,
  },
})
export class InterviewAudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InterviewAudioGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly interviewBuddyService: InterviewBuddyService,
    private readonly liveSessions: LiveSessionService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token?.toString();
      if (!token) {
        this.logger.warn('Connection rejected: no token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload._id || payload.id;

      const sessionId = client.handshake.query?.sessionId?.toString();
      if (!sessionId) {
        this.logger.warn('Connection rejected: no sessionId');
        client.disconnect();
        return;
      }
      client.sessionId = sessionId;

      // Ownership: getSession is scoped by userId and throws otherwise.
      const found = await this.interviewBuddyService.getSession(sessionId, client.userId);
      const session: any = (found as any)?.session;
      if (!session) {
        this.logger.warn(`Connection rejected: session ${sessionId} not found for this user`);
        client.disconnect();
        return;
      }

      // LIVE_NOTES is a text-only mode; it must never open an audio channel.
      if (session.mode !== 'PRACTICE' && session.mode !== 'CONSENT') {
        this.logger.warn(`Connection rejected: audio not allowed in mode ${session.mode}`);
        client.emit('notice', {
          level: 'error',
          message: 'This session does not capture audio.',
        });
        client.disconnect();
        return;
      }

      client.join(`session:${sessionId}`);

      const started = await this.liveSessions.start({
        sessionId,
        userId: client.userId,
        consentAcknowledgedAt: session.consentAcknowledgedAt,
        retainTranscript: session.retainTranscript,
        contextPack: session.contextPack,
        emit: (event) => client.emit(event.type, event),
      });

      if (!started.ok) {
        // Say why, then close. Never leave a socket open that looks live but
        // transcribes nothing.
        client.emit('notice', { level: 'error', message: started.reason });
        client.disconnect();
        return;
      }

      client.emit('connected', {
        sessionId,
        transcription: this.liveSessions.transcriptionAvailable,
      });
      this.logger.log(`Client ${client.userId} connected to session ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Connection error: ${error?.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.sessionId) return;
    await this.liveSessions.stop(client.sessionId);
    this.logger.log(`Client ${client.userId} disconnected from ${client.sessionId}`);
  }

  /**
   * One PCM frame (16kHz mono, ~100ms).
   *
   * `source` distinguishes the meeting tab (the interviewer) from the
   * candidate's own microphone. Turn attribution comes from the track, not from
   * speaker diarisation — which is both more reliable and far cheaper.
   */
  @SubscribeMessage('audio-chunk')
  handleAudioChunk(
    @MessageBody() data: { chunk: ArrayBuffer; source?: SpeechSource },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !client.sessionId) {
      client.emit('notice', { level: 'error', message: 'Not authenticated.' });
      return;
    }
    if (!data?.chunk) return;

    this.liveSessions.pushAudio(
      client.sessionId,
      Buffer.from(data.chunk),
      data.source === 'CANDIDATE' ? 'CANDIDATE' : 'INTERVIEWER',
    );
  }

  /** The candidate typed a question themselves (LIVE_NOTES, or STT is down). */
  @SubscribeMessage('manual-question')
  async handleManualQuestion(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !client.sessionId || !data?.text?.trim()) return;
    await this.liveSessions.askManually(client.sessionId, data.text.trim(), (event) =>
      client.emit(event.type, event),
    );
  }

  @SubscribeMessage('stop-recording')
  async handleStopRecording(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.sessionId) return;
    await this.liveSessions.stop(client.sessionId);
    client.emit('notice', { level: 'info', message: 'Capture stopped.' });
  }
}
