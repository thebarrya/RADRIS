import { FastifyInstance } from 'fastify';
import { Server } from 'ws';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'examination_updated' | 'examination_created' | 'report_updated' | 'system_notification';
  payload: any;
  timestamp: string;
}

export class WebSocketService {
  private wss: Server;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.wss = new Server({ 
      port: 3002,
      path: '/ws',
    });

    this.setupWebSocketServer();
    this.setupHeartbeat();
    
    fastify.log.info('🔌 WebSocket server started on port 3002');
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      this.fastify.log.error('WebSocket server error:', error);
    });
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    try {
      // Extract token from query string or headers
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(1008, 'No authentication token provided');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key') as any;
      
      ws.userId = decoded.userId;
      ws.userRole = decoded.role;
      ws.isAlive = true;

      // Add to clients map
      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      this.fastify.log.info(`WebSocket client connected: ${decoded.email} (${decoded.role})`);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'system_notification',
        payload: { message: 'Connected to RADRIS real-time updates' },
        timestamp: new Date().toISOString(),
      });

      // Handle messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          this.fastify.log.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

    } catch (error) {
      this.fastify.log.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      this.fastify.log.info(`WebSocket client disconnected: ${ws.userId}`);
    }
  }

  private handleClientMessage(ws: AuthenticatedWebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'system_notification',
          payload: { message: 'pong' },
          timestamp: new Date().toISOString(),
        });
        break;
      
      case 'subscribe_examination':
        // Client can subscribe to specific examination updates
        // This could be extended for room-based subscriptions
        break;
      
      default:
        this.fastify.log.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private setupHeartbeat() {
    // Ping all clients every 30 seconds to check connection health
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // Public methods for broadcasting updates

  public broadcastExaminationUpdate(examinationId: string, examination: any, updateType: 'created' | 'updated' = 'updated') {
    const message: WebSocketMessage = {
      type: updateType === 'created' ? 'examination_created' : 'examination_updated',
      payload: {
        examinationId,
        examination,
        updateType,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastReportUpdate(reportId: string, report: any, examinationId: string) {
    const message: WebSocketMessage = {
      type: 'report_updated',
      payload: {
        reportId,
        report,
        examinationId,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastSystemNotification(notification: { message: string; level: 'info' | 'warning' | 'error' }) {
    const message: WebSocketMessage = {
      type: 'system_notification',
      payload: notification,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  private broadcastToAll(message: WebSocketMessage) {
    let sentCount = 0;
    
    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });

    this.fastify.log.info(`Broadcasted ${message.type} to ${sentCount} clients`);
  }

  public broadcastToRole(message: WebSocketMessage, roles: string[]) {
    let sentCount = 0;

    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.userRole && roles.includes(ws.userRole)) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });

    this.fastify.log.info(`Broadcasted ${message.type} to ${sentCount} clients with roles: ${roles.join(', ')}`);
  }

  public getConnectedClientsCount(): number {
    let count = 0;
    this.clients.forEach((clientSet) => {
      count += clientSet.size;
    });
    return count;
  }

  public getUsersOnline(): string[] {
    return Array.from(this.clients.keys());
  }

  public close() {
    this.wss.close();
  }
}