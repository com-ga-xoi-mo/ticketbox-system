import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../platform/redis/redis.tokens';

@WebSocketGateway({ namespace: '/resale', cors: { origin: '*' } })
export class ResaleMessagingGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private jwtService: JwtService,
    @Inject(REDIS_CLIENT) private redisClient: Redis
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket server started for Resale Messaging (Redis Adapter configured via IoAdapter in main.ts recommended)');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      console.log('WS Connection attempt. Token present?', !!token);
      if (!token) throw new WsException('Missing token');
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) throw new WsException('Invalid token');
      
      const userId = payload.sub;
      client.join(`user:${userId}`);
      console.log(`User ${userId} joined room user:${userId}`);
    } catch (e) {
      console.error('WS Connection rejected:', (e as any).message);
      client.disconnect();
    }
  }

  sendMessageToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('message.new', payload);
  }
}
