import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NotificationResponseData } from '../types/interfaces';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Cliente conectado: ${socket.id}`);
  
      // Autenticación del usuario
      socket.on('authenticate', (userId: string) => {
        this.connectedUsers.set(userId, socket.id);
        socket.join(`user_${userId}`);
        console.log(`Usuario ${userId} autenticado y conectado`);
      });
  
      // **AGREGAR ESTOS EVENTOS:**
      
      // Solicitar historial de notificaciones
      socket.on('get_notifications', async (data: { page?: number, limit?: number, unreadOnly?: boolean }) => {
        try {
          // Obtener userId del socket autenticado
          let userId = null;
          for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === socket.id) {
              userId = uid;
              break;
            }
          }
  
          if (!userId) {
            socket.emit('error', { message: 'Usuario no autenticado' });
            return;
          }
  
          console.log(`Solicitando notificaciones para usuario ${userId}:`, data);
  
          // Importar notificationService
          const { notificationService } = await import('../services/NotificationService');
          
          // Obtener notificaciones del usuario
          const result = await notificationService.getUserNotifications(
            userId, 
            data.page || 1, 
            data.limit || 20
          );
  
          console.log(`Enviando ${result.notifications.length} notificaciones a usuario ${userId}`);
  
          // Enviar notificaciones de vuelta
          socket.emit('notifications_history', result.notifications);
  
        } catch (error) {
          console.error('Error obteniendo notificaciones:', error);
          socket.emit('error', { message: 'Error obteniendo notificaciones' });
        }
      });
  
      // Solicitar contador de no leídas
      socket.on('get_unread_count', async () => {
        try {
          // Obtener userId del socket autenticado
          let userId = null;
          for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === socket.id) {
              userId = uid;
              break;
            }
          }
  
          if (!userId) {
            socket.emit('error', { message: 'Usuario no autenticado' });
            return;
          }
  
          console.log(`Solicitando contador de no leídas para usuario ${userId}`);
  
          // Importar notificationService
          const { notificationService } = await import('../services/NotificationService');
          
          // Obtener contador
          const count = await notificationService.getUnreadCount(userId);
  
          console.log(`Enviando contador ${count} a usuario ${userId}`);
  
          // Enviar contador de vuelta
          socket.emit('unread_count', count);
  
        } catch (error) {
          console.error('Error obteniendo contador:', error);
          socket.emit('error', { message: 'Error obteniendo contador' });
        }
      });
  
      // Marcar notificación como leída
      socket.on('mark_notification_read', async (notificationId: string) => {
        try {
          // Obtener userId del socket autenticado
          let userId = null;
          for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === socket.id) {
              userId = uid;
              break;
            }
          }
  
          if (!userId) {
            socket.emit('error', { message: 'Usuario no autenticado' });
            return;
          }
  
          // Importar notificationService
          const { notificationService } = await import('../services/NotificationService');
          
          // Marcar como leída
          await notificationService.markAsRead(notificationId, userId);
  
          console.log(`Notificación ${notificationId} marcada como leída para usuario ${userId}`);
  
          // Enviar confirmación
          socket.emit('notification_marked_read', { notificationId });
  
        } catch (error) {
          console.error('Error marcando notificación como leída:', error);
          socket.emit('error', { message: 'Error marcando notificación como leída' });
        }
      });
  
      // **EVENTOS EXISTENTES:**
      
      // Unirse a canales específicos
      socket.on('join_channel', (channel: string) => {
        socket.join(channel);
        console.log(`Socket ${socket.id} se unió al canal: ${channel}`);
      });
  
      // Desconexión
      socket.on('disconnect', () => {
        // Encontrar y remover el usuario desconectado
        for (const [userId, socketId] of this.connectedUsers.entries()) {
          if (socketId === socket.id) {
            this.connectedUsers.delete(userId);
            console.log(`Usuario ${userId} desconectado`);
            break;
          }
        }
      });
    });
  }

  // Enviar notificación a un usuario específico
  public sendToUser(userId: string, notification: NotificationResponseData) {
    this.io.to(`user_${userId}`).emit('notification', notification);
    console.log(`Notificación enviada a usuario ${userId}:`, notification.title);
  }

  // Enviar notificación a múltiples usuarios
  public sendToUsers(userIds: string[], notification: NotificationResponseData) {
    userIds.forEach(userId => {
      this.sendToUser(userId, notification);
    });
  }

  // Enviar notificación a un canal específico (ej: administradores)
  public sendToChannel(channel: string, notification: NotificationResponseData) {
    this.io.to(channel).emit('notification', notification);
    console.log(`Notificación enviada al canal ${channel}:`, notification.title);
  }

  // Enviar notificación a todos los usuarios conectados
  public broadcast(notification: NotificationResponseData) {
    this.io.emit('notification', notification);
    console.log('Notificación broadcast enviada:', notification.title);
  }

  // Verificar si un usuario está conectado
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Obtener número de usuarios conectados
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Obtener lista de usuarios conectados
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}

// Instancia singleton
let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (server: HTTPServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(server);
  }
  return webSocketService;
};

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService;
};
