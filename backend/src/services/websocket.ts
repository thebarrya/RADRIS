import { FastifyInstance } from 'fastify';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  isAlive?: boolean;
  subscriptions?: Set<string>; // Track subscribed examination IDs
}

interface WebSocketMessage {
  type: 'examination_updated' | 'examination_created' | 'examination_deleted' | 
        'report_updated' | 'report_created' | 'report_validated' |
        'patient_updated' | 'patient_created' |
        'user_status_changed' | 'system_notification' |
        'worklist_refresh' | 'assignment_changed' |
        'dicom_arrival' | 'study_linked' | 'metadata_sync' | 'dicom_error';
  payload: any;
  timestamp: string;
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private wss: Server;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    
    try {
      this.wss = new Server({ 
        port: 3002,
        path: '/ws',
        maxPayload: 16 * 1024, // 16KB max message size
        perMessageDeflate: false, // Disable compression for better performance
      });

      this.setupWebSocketServer();
      this.setupHeartbeat();
      
      fastify.log.info('🔌 WebSocket server started on port 3002');
    } catch (error) {
      fastify.log.error(`Failed to start WebSocket server: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      // Immediately handle authentication before doing anything else
      setImmediate(() => {
        this.handleConnection(ws, request);
      });
    });

    this.wss.on('error', (error) => {
      this.fastify.log.error(`WebSocket server error:: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    try {
      // Extract token from query string or headers
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.fastify.log.warn('WebSocket connection attempt without token');
        ws.close(1008, 'No authentication token provided');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key') as any;
      
      if (!decoded.userId || !decoded.email) {
        this.fastify.log.warn('Invalid token payload - missing required fields');
        ws.close(1008, 'Invalid token');
        return;
      }
      
      ws.userId = decoded.userId;
      ws.userRole = decoded.role;
      ws.userEmail = decoded.email;
      ws.isAlive = true;
      ws.subscriptions = new Set();

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
          this.fastify.log.error(`Error parsing WebSocket message from ${ws.userId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        this.fastify.log.info(`WebSocket client ${ws.userId} disconnected with code ${code}: ${reason}`);
        this.handleDisconnection(ws);
      });

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle errors
      ws.on('error', (error) => {
        this.fastify.log.error(`WebSocket error for user ${ws.userId}: ${error.message}`);
      });

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        this.fastify.log.warn(`WebSocket JWT verification failed: ${error.message}`);
        ws.close(1008, 'Invalid token');
      } else {
        this.fastify.log.error(`WebSocket authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        ws.close(1008, 'Authentication failed');
      }
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
        // Mark client as alive
        ws.isAlive = true;
        break;
      
      case 'subscribe_examination':
        if (message.examinationId && ws.subscriptions) {
          ws.subscriptions.add(message.examinationId);
          this.fastify.log.info(`User ${ws.userId} subscribed to examination ${message.examinationId}`);
        }
        break;
      
      case 'unsubscribe_examination':
        if (message.examinationId && ws.subscriptions) {
          ws.subscriptions.delete(message.examinationId);
          this.fastify.log.info(`User ${ws.userId} unsubscribed from examination ${message.examinationId}`);
        }
        break;

      case 'subscribe_worklist':
        this.sendToClient(ws, {
          type: 'system_notification',
          payload: { message: 'Subscribed to worklist updates' },
          timestamp: new Date().toISOString(),
        });
        break;

      case 'user_status':
        // Handle user status updates (online/offline/busy)
        if (message.status) {
          this.broadcastUserStatusChange(ws.userId!, message.status, ws.userEmail!);
        }
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
        if (ws.readyState !== ws.OPEN) {
          return;
        }
        
        if (ws.isAlive === false) {
          this.fastify.log.info(`Terminating dead connection for user ${ws.userId}`);
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          this.fastify.log.error(`Failed to ping client ${ws.userId}:`, error);
          ws.terminate();
        }
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

  public broadcastPatientUpdate(patientId: string, patient: any, updateType: 'created' | 'updated' = 'updated') {
    const message: WebSocketMessage = {
      type: updateType === 'created' ? 'patient_created' : 'patient_updated',
      payload: {
        patientId,
        patient,
        updateType,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastReportCreated(reportId: string, report: any, examinationId: string) {
    const message: WebSocketMessage = {
      type: 'report_created',
      payload: {
        reportId,
        report,
        examinationId,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastReportValidated(reportId: string, report: any, examinationId: string, validatorId: string) {
    const message: WebSocketMessage = {
      type: 'report_validated',
      payload: {
        reportId,
        report,
        examinationId,
        validatorId,
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all users, but especially notify the original author
    this.broadcastToAll(message);
  }

  public broadcastAssignmentChange(examinationId: string, oldAssigneeId: string | null, newAssigneeId: string | null, examination: any) {
    const message: WebSocketMessage = {
      type: 'assignment_changed',
      payload: {
        examinationId,
        oldAssigneeId,
        newAssigneeId,
        examination,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastWorklistRefresh() {
    const message: WebSocketMessage = {
      type: 'worklist_refresh',
      payload: {
        message: 'Worklist data has been updated',
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastUserStatusChange(userId: string, status: string, email: string) {
    const message: WebSocketMessage = {
      type: 'user_status_changed',
      payload: {
        userId,
        status,
        email,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastExaminationDeleted(examinationId: string, patientInfo: any) {
    const message: WebSocketMessage = {
      type: 'examination_deleted',
      payload: {
        examinationId,
        patientInfo,
      },
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

  public broadcastToSubscribers(examinationId: string, message: WebSocketMessage) {
    let sentCount = 0;

    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.subscriptions?.has(examinationId)) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });

    this.fastify.log.info(`Broadcasted ${message.type} for examination ${examinationId} to ${sentCount} subscribers`);
  }

  public broadcastToUser(userId: string, message: WebSocketMessage) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      let sentCount = 0;
      userClients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
      this.fastify.log.info(`Sent ${message.type} to user ${userId} (${sentCount} connections)`);
    }
  }

  public getClientInfo() {
    const info = Array.from(this.clients.entries()).map(([userId, clientSet]) => {
      const clients = Array.from(clientSet).map((ws) => ({
        role: ws.userRole,
        email: ws.userEmail,
        isAlive: ws.isAlive,
        subscriptions: ws.subscriptions ? Array.from(ws.subscriptions) : [],
      }));
      return { userId, clients };
    });

    return {
      totalClients: this.getConnectedClientsCount(),
      totalUsers: this.clients.size,
      clientDetails: info,
    };
  }

  // DICOM-specific notification methods

  public broadcastDicomArrival(studyData: {
    studyInstanceUID: string;
    patientName: string;
    patientID: string;
    studyDescription?: string;
    modality?: string;
    studyDate?: string;
    accessionNumber?: string;
    institutionName?: string;
  }) {
    const message: WebSocketMessage = {
      type: 'dicom_arrival',
      payload: {
        ...studyData,
        message: `New ${studyData.modality || 'DICOM'} study arrived for ${studyData.patientName}`,
        title: 'New DICOM Study'
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastStudyLinked(linkData: {
    examinationId: string;
    studyInstanceUID: string;
    patientName: string;
    accessionNumber?: string;
    modality?: string;
    studyDescription?: string;
  }) {
    const message: WebSocketMessage = {
      type: 'study_linked',
      payload: {
        ...linkData,
        message: `DICOM study linked to examination for ${linkData.patientName}`,
        title: 'Study Linked'
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastMetadataSync(syncData: {
    patientsUpdated: number;
    studiesLinked: number;
    patientsProcessed: number;
    studiesProcessed: number;
    errors: string[];
    success: boolean;
    duration?: number;
  }) {
    const message: WebSocketMessage = {
      type: 'metadata_sync',
      payload: {
        ...syncData,
        message: syncData.success 
          ? `Metadata sync completed: ${syncData.patientsUpdated} patients updated, ${syncData.studiesLinked} studies linked`
          : `Metadata sync failed with ${syncData.errors.length} errors`,
        title: 'Metadata Synchronization'
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToAll(message);
  }

  public broadcastDicomError(errorData: {
    operation: string;
    error: string;
    studyInstanceUID?: string;
    patientID?: string;
    details?: any;
  }) {
    const message: WebSocketMessage = {
      type: 'dicom_error',
      payload: {
        ...errorData,
        message: `DICOM ${errorData.operation} failed: ${errorData.error}`,
        title: 'DICOM Operation Error'
      },
      timestamp: new Date().toISOString(),
    };

    // Notify administrators and technicians about errors
    this.broadcastToRole(message, ['ADMIN', 'TECHNICIAN']);
  }

  public close() {
    this.wss.close();
  }
}