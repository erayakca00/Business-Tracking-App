import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Retrieve token from handshake auth or headers
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        console.log(
          `[Socket] Rejected connection from ${client.id}: No token provided.`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client['user'] = payload; // Attach user payload to the socket
      console.log(
        `[Socket] Authorized client connected: ${client.id} (${payload.email})`,
      );
    } catch (error) {
      console.log(
        `[Socket] Rejected connection from ${client.id}: Invalid token.`,
        error,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-group')
  handleJoinGroup(client: Socket, groupId: string) {
    if (!groupId) return;
    const roomName = `group:${groupId}`;
    client.join(roomName);
    console.log(`[Socket] Client ${client.id} joined room: ${roomName}`);
    client.emit('joined-room', roomName);
  }

  @SubscribeMessage('leave-group')
  handleLeaveGroup(client: Socket, groupId: string) {
    if (!groupId) return;
    const roomName = `group:${groupId}`;
    client.leave(roomName);
    console.log(`[Socket] Client ${client.id} left room: ${roomName}`);
    client.emit('left-room', roomName);
  }

  // Broadcast methods called from services
  broadcastTaskCreated(groupId: string, task: any) {
    this.server.to(`group:${groupId}`).emit('task:created', task);
    console.log(`[Socket] Broadcast 'task:created' to room group:${groupId}`);
  }

  broadcastTaskUpdated(groupId: string, task: any) {
    this.server.to(`group:${groupId}`).emit('task:updated', task);
    console.log(`[Socket] Broadcast 'task:updated' to room group:${groupId}`);
  }

  broadcastTaskDeleted(groupId: string, taskId: string) {
    this.server
      .to(`group:${groupId}`)
      .emit('task:deleted', { taskId, groupId });
    console.log(`[Socket] Broadcast 'task:deleted' to room group:${groupId}`);
  }

  broadcastCommentCreated(groupId: string, comment: any) {
    this.server.to(`group:${groupId}`).emit('comment:created', comment);
    console.log(
      `[Socket] Broadcast 'comment:created' to room group:${groupId}`,
    );
  }

  broadcastCommentDeleted(groupId: string, commentId: string, taskId: string) {
    this.server
      .to(`group:${groupId}`)
      .emit('comment:deleted', { commentId, taskId, groupId });
    console.log(
      `[Socket] Broadcast 'comment:deleted' to room group:${groupId}`,
    );
  }
}
