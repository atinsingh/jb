import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupabaseTokenService } from '../auth/supabase-token.service';
import { corsOrigins } from '../common/config/cors-origins';
import { UserDocument } from '../schemas/user.schema';
import { conciergeRoom, ConciergeMessagesService } from './concierge-messages.service';

interface ConciergeSocket extends Socket {
  user?: UserDocument;
}

@WebSocketGateway({ namespace: '/concierge', cors: { origin: corsOrigins(), credentials: true } })
export class ConciergeMessagesGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ConciergeMessagesGateway.name);

  constructor(
    private readonly tokens: SupabaseTokenService,
    private readonly messages: ConciergeMessagesService,
  ) {}

  afterInit() {
    this.messages.bind((candidateId, employerId, message) => {
      this.server?.to(conciergeRoom(candidateId, employerId)).emit('message', message);
    });
  }

  async handleConnection(client: ConciergeSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token?.toString();
      if (!token) throw new Error('missing token');
      client.user = await this.tokens.authenticate(token);
    } catch (err) {
      this.logger.warn(`Concierge socket rejected: ${err instanceof Error ? err.message : err}`);
      client.disconnect();
    }
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: ConciergeSocket, @MessageBody() body: { with?: string }) {
    if (!client.user || !body?.with) return { ok: false };
    try {
      await this.messages.list(client.user, body.with);
      await client.join(conciergeRoom(client.user._id.toString(), body.with));
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not open this conversation' };
    }
  }

  @SubscribeMessage('send')
  async send(@ConnectedSocket() client: ConciergeSocket, @MessageBody() body: { with?: string; body?: string }) {
    if (!client.user || !body?.with) return { error: 'Choose a conversation first' };
    try {
      return await this.messages.send(client.user, body.with, body.body || '');
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not send' };
    }
  }
}
