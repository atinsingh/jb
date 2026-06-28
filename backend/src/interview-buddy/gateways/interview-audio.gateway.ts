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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InterviewBuddyService } from '../interview-buddy.service';
import { STTProvider } from '../interfaces/stt-provider.interface';
import { Inject } from '@nestjs/common';
import { TurnType } from '../../schemas/interview-turn.schema';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

@WebSocketGateway({
  namespace: '/interview-sessions',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class InterviewAudioGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InterviewAudioGateway.name);
  private readonly activeConnections = new Map<string, AuthenticatedSocket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly interviewBuddyService: InterviewBuddyService,
    @Inject('STTProvider') private readonly sttProvider: STTProvider,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token?.toString();

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload._id || payload.id;

      // Extract session ID from query
      const sessionId = client.handshake.query?.sessionId?.toString();
      if (!sessionId) {
        this.logger.warn(`Connection rejected: No sessionId provided`);
        client.disconnect();
        return;
      }

      client.sessionId = sessionId;

      // Verify user owns the session
      try {
        const session = await this.interviewBuddyService.getSession(
          sessionId,
          client.userId,
        );
        if (!session) {
          this.logger.warn(
            `Connection rejected: Session ${sessionId} not found or access denied`,
          );
          client.disconnect();
          return;
        }

        // Check if session is in Practice or Consent mode
        if (
          session.session.mode !== 'PRACTICE' &&
          session.session.mode !== 'CONSENT'
        ) {
          this.logger.warn(
            `Connection rejected: Audio streaming not allowed for mode ${session.session.mode}`,
          );
          client.disconnect();
          return;
        }
      } catch (error) {
        this.logger.error(`Error verifying session: ${error.message}`);
        client.disconnect();
        return;
      }

      // Store connection
      const connectionKey = `${client.userId}:${sessionId}`;
      this.activeConnections.set(connectionKey, client);

      // Join session room
      client.join(`session:${sessionId}`);

      this.logger.log(
        `Client connected: ${client.userId} to session ${sessionId}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        sessionId,
        message: 'Connected to audio stream',
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.sessionId) {
      const connectionKey = `${client.userId}:${client.sessionId}`;
      this.activeConnections.delete(connectionKey);
      this.logger.log(
        `Client disconnected: ${client.userId} from session ${client.sessionId}`,
      );
    }
  }

  @SubscribeMessage('audio-chunk')
  async handleAudioChunk(
    @MessageBody() data: { chunk: ArrayBuffer; timestamp: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !client.sessionId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Convert ArrayBuffer to Buffer
      const audioBuffer = Buffer.from(data.chunk);

      // For now, we'll accumulate chunks and process periodically
      // In production, you'd want to use streaming STT if available
      // For this implementation, we'll use batch processing

      // Emit acknowledgment
      client.emit('audio-received', {
        timestamp: data.timestamp,
        message: 'Audio chunk received',
      });

      // Note: Real-time streaming STT would process chunks here
      // For now, we'll use a simplified approach where the client
      // sends complete audio segments
    } catch (error) {
      this.logger.error(`Error processing audio chunk: ${error.message}`);
      client.emit('error', { message: 'Failed to process audio chunk' });
    }
  }

  @SubscribeMessage('audio-segment')
  async handleAudioSegment(
    @MessageBody()
    data: {
      audioData: ArrayBuffer;
      startTime: number;
      endTime: number;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId || !client.sessionId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      // Convert ArrayBuffer to Buffer
      const audioBuffer = Buffer.from(data.audioData);

      // Transcribe audio segment
      const transcription = await this.sttProvider.transcribe(audioBuffer);

      // Create turn for the answer
      const turn = await this.interviewBuddyService.addTurn(
        client.sessionId,
        client.userId,
        TurnType.ANSWER,
        transcription.text,
        transcription.segments,
        transcription.confidence,
      );

      // Emit transcript to client
      client.emit('transcript', {
        turnId: turn._id,
        text: transcription.text,
        segments: transcription.segments,
        confidence: transcription.confidence,
        timestamp: Date.now(),
      });

      // Broadcast to session room (for multi-client scenarios)
      this.server.to(`session:${client.sessionId}`).emit('transcript-update', {
        turnId: turn._id,
        text: transcription.text,
        type: 'ANSWER',
      });
    } catch (error) {
      this.logger.error(`Error processing audio segment: ${error.message}`);
      client.emit('error', { message: 'Failed to transcribe audio' });
    }
  }

  @SubscribeMessage('stop-recording')
  async handleStopRecording(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId || !client.sessionId) {
      return;
    }

    client.emit('recording-stopped', {
      message: 'Recording stopped',
      timestamp: Date.now(),
    });
  }
}

