import { prisma } from '../config/database';
import { 
  NotificationData, 
  NotificationResponseData, 
  NotificationType, 
  NotificationChannel,
  NotificationPriority,
  EmailConfig,
  SMSConfig,
  PushConfig
} from '../types/interfaces';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import cron from 'node-cron';
import { getWebSocketService } from './WebSocketService';

export class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private twilioClient: twilio.Twilio | null = null;
  private pushConfig: PushConfig | null = null;

  constructor() {
    this.initializeEmailService();
    this.initializeSMSService();
    this.initializePushService();
    this.startNotificationProcessor();
  }

  private initializeEmailService() {
    const emailConfig: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(emailConfig);
    }
  }

  private initializeSMSService() {
    const smsConfig: SMSConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || ''
    };

    if (smsConfig.accountSid && smsConfig.authToken) {
      this.twilioClient = twilio(smsConfig.accountSid, smsConfig.authToken);
    }
  }

  private initializePushService() {
    this.pushConfig = {
      serverKey: process.env.FCM_SERVER_KEY || '',
      projectId: process.env.FCM_PROJECT_ID || ''
    };
  }

  // Crear notificación
  async createNotification(notificationData: NotificationData): Promise<NotificationResponseData> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: notificationData.userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type as any,
          channel: notificationData.channel as any,
          priority: (notificationData.priority || 'MEDIUM') as any,
          data: notificationData.data
        }
      });

      // Enviar notificación en tiempo real via WebSocket
      this.sendRealtimeNotification(notification as NotificationResponseData);

      return notification as NotificationResponseData;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Enviar notificación inmediatamente
  async sendNotification(notificationId: string): Promise<boolean> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: true }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Verificar preferencias del usuario
      const preferences = await this.getUserPreferences(notification.userId, notification.type as NotificationType);
      
      if (!preferences) {
        console.log(`No preferences found for user ${notification.userId}, using defaults`);
      }

      let success = false;

      switch (notification.channel) {
        case 'EMAIL':
          success = await this.sendEmail(notification);
          break;
        case 'PUSH':
          success = await this.sendPush(notification);
          break;
        case 'SMS':
          success = await this.sendSMS(notification);
          break;
        case 'IN_APP':
          success = await this.sendInApp(notification);
          break;
        case 'WEBHOOK':
          success = await this.sendWebhook(notification);
          break;
        default:
          console.error(`Unknown notification channel: ${notification.channel}`);
      }

      // Actualizar estado de la notificación
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: success ? 'SENT' : 'FAILED',
          sentAt: success ? new Date() : null
        }
      });

      return success;
    } catch (error) {
      console.error('Error sending notification:', error);
      
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED' }
      });

      return false;
    }
  }

  // Enviar email
  private async sendEmail(notification: any): Promise<boolean> {
    if (!this.emailTransporter) {
      console.log('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@tuestado.com',
        to: notification.user.email,
        subject: notification.title,
        html: this.formatEmailContent(notification)
      };

      await this.emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Enviar SMS
  private async sendSMS(notification: any): Promise<boolean> {
    if (!this.twilioClient) {
      console.log('SMS service not configured');
      return false;
    }

    try {
      await this.twilioClient.messages.create({
        body: `${notification.title}\n\n${notification.message}`,
        from: process.env.TWILIO_FROM_NUMBER,
        to: notification.user.phone || notification.user.email // Fallback to email if no phone
      });

      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  // Enviar Push Notification
  private async sendPush(notification: any): Promise<boolean> {
    // Implementar FCM o similar
    console.log('Push notification not implemented yet');
    return false;
  }

  // Enviar notificación in-app
  private async sendInApp(notification: any): Promise<boolean> {
    // Las notificaciones in-app se almacenan en la BD
    // El frontend las obtiene via API
    return true;
  }

  // Enviar notificación en tiempo real via WebSocket
  private sendRealtimeNotification(notification: NotificationResponseData) {
    const webSocketService = getWebSocketService();
    if (webSocketService) {
      webSocketService.sendToUser(notification.userId, notification);
    }
  }

  // Enviar webhook
  private async sendWebhook(notification: any): Promise<boolean> {
    // Implementar webhooks
    console.log('Webhook notification not implemented yet');
    return false;
  }

  // Formatear contenido de email
  private formatEmailContent(notification: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${notification.title}</h2>
        <p style="color: #666; line-height: 1.6;">${notification.message}</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          Esta es una notificación automática de Tu Estado.
        </p>
      </div>
    `;
  }

  // Obtener preferencias del usuario
  private async getUserPreferences(userId: string, type: NotificationType) {
    return await prisma.notificationPreference.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as any
        }
      }
    });
  }

  // Procesar notificaciones pendientes
  private startNotificationProcessor() {
    // Ejecutar cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        const pendingNotifications = await prisma.notification.findMany({
          where: { status: 'PENDING' },
          include: { user: true },
          take: 10 // Procesar máximo 10 a la vez
        });

        for (const notification of pendingNotifications) {
          await this.sendNotification(notification.id);
        }
      } catch (error) {
        console.error('Error processing notifications:', error);
      }
    });
  }

  // Notificaciones específicas del ecommerce
  async notifyOrderCreated(userId: string, orderData: any) {
    return await this.createNotification({
      userId,
      title: '¡Orden Creada Exitosamente!',
      message: `Tu orden #${orderData.id} ha sido creada y está pendiente de validación del pago. Total: $${orderData.total}`,
      type: 'ORDER_CREATED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, total: orderData.total }
    });
  }

  async notifyOrderProcessing(userId: string, orderData: any) {
    return await this.createNotification({
      userId,
      title: '¡Orden en preparación!',
      message: `Tu orden #${orderData.id} está siendo procesada y preparada para envío.`,
      type: 'ORDER_PROCESSING',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, total: orderData.total }
    });
  }

  async notifyPaymentApproved(userId: string, orderData: any) {
    return await this.createNotification({
      userId,
      title: '¡Pago Aprobado!',
      message: `El pago de tu orden #${orderData.id} ha sido aprobado y está siendo procesada.`,
      type: 'ORDER_PAYMENT_APPROVED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id }
    });
  }

  async notifyPaymentRejected(userId: string, orderData: any, reason?: string) {
    return await this.createNotification({
      userId,
      title: 'Pago Rechazado',
      message: `El pago de tu orden #${orderData.id} ha sido rechazado. ${reason ? `Razón: ${reason}` : ''}`,
      type: 'ORDER_PAYMENT_REJECTED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, reason }
    });
  }

  async notifyOrderShipped(userId: string, orderData: any, trackingNumber?: string) {
    return await this.createNotification({
      userId,
      title: '¡Tu Orden ha Sido Enviada!',
      message: `Tu orden #${orderData.id} ha sido enviada. ${trackingNumber ? `Número de seguimiento: ${trackingNumber}` : ''}`,
      type: 'ORDER_SHIPPED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, trackingNumber }
    });
  }

  async notifyOrderDelivered(userId: string, orderData: any) {
    return await this.createNotification({
      userId,
      title: '¡Orden Entregada!',
      message: `Tu orden #${orderData.id} ha sido entregada exitosamente. ¡Gracias por tu compra!`,
      type: 'ORDER_DELIVERED',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { orderId: orderData.id }
    });
  }

  // Nuevas notificaciones para casos de uso adicionales
  async notifyOrderCancelled(userId: string, orderData: any, reason?: string) {
    return await this.createNotification({
      userId,
      title: 'Orden Cancelada',
      message: `Tu orden #${orderData.id} ha sido cancelada. ${reason ? `Razón: ${reason}` : ''}`,
      type: 'ORDER_CANCELLED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, reason }
    });
  }

  async notifyOrderRefunded(userId: string, orderData: any, amount: number) {
    return await this.createNotification({
      userId,
      title: 'Reembolso Procesado',
      message: `Se ha procesado un reembolso de $${amount} para tu orden #${orderData.id}.`,
      type: 'ORDER_REFUNDED',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { orderId: orderData.id, amount }
    });
  }

  async notifyProductBackInStock(userId: string, productData: any) {
    return await this.createNotification({
      userId,
      title: '¡Producto Disponible!',
      message: `El producto "${productData.name}" está nuevamente disponible en stock.`,
      type: 'PRODUCT_BACK_IN_STOCK',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { productId: productData.id, productName: productData.name }
    });
  }

  async notifyPriceDrop(userId: string, productData: any, oldPrice: number, newPrice: number) {
    return await this.createNotification({
      userId,
      title: '¡Precio Reducido!',
      message: `El precio de "${productData.name}" bajó de $${oldPrice} a $${newPrice}.`,
      type: 'PRICE_DROP',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { productId: productData.id, productName: productData.name, oldPrice, newPrice }
    });
  }

  async notifyNewReview(userId: string, productData: any, reviewData: any) {
    return await this.createNotification({
      userId,
      title: 'Nueva Reseña',
      message: `Se agregó una nueva reseña para "${productData.name}".`,
      type: 'NEW_REVIEW',
      channel: 'IN_APP',
      priority: 'LOW',
      data: { productId: productData.id, productName: productData.name, reviewId: reviewData.id }
    });
  }

  async notifyWishlistItemAvailable(userId: string, productData: any) {
    return await this.createNotification({
      userId,
      title: '¡Item de Lista de Deseos Disponible!',
      message: `Un producto de tu lista de deseos "${productData.name}" está disponible.`,
      type: 'WISHLIST_ITEM_AVAILABLE',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { productId: productData.id, productName: productData.name }
    });
  }

  async notifyPromoCode(userId: string, promoData: any) {
    return await this.createNotification({
      userId,
      title: '¡Código Promocional!',
      message: `Tienes un nuevo código promocional: ${promoData.code} - ${promoData.description}`,
      type: 'PROMO_CODE',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { code: promoData.code, description: promoData.description, discount: promoData.discount }
    });
  }

  async notifyAccountSecurity(userId: string, securityEvent: string) {
    return await this.createNotification({
      userId,
      title: 'Alerta de Seguridad',
      message: `Actividad de seguridad detectada: ${securityEvent}`,
      type: 'ACCOUNT_SECURITY',
      channel: 'IN_APP',
      priority: 'HIGH',
      data: { securityEvent }
    });
  }

  async notifyWelcome(userId: string, userName: string) {
    return await this.createNotification({
      userId,
      title: '¡Bienvenido a Tu Estado!',
      message: `Hola ${userName}, gracias por registrarte. ¡Explora nuestros productos y disfruta de tu compra!`,
      type: 'WELCOME',
      channel: 'IN_APP',
      priority: 'MEDIUM',
      data: { userName }
    });
  }

  async notifyLoginSuccess(userId: string, userEmail: string, loginTime: Date) {
    return await this.createNotification({
      userId,
      title: 'Inicio de Sesión Exitoso',
      message: `Has iniciado sesión correctamente desde ${userEmail} a las ${loginTime.toLocaleString()}.`,
      type: 'ACCOUNT_SECURITY',
      channel: 'IN_APP',
      priority: 'LOW',
      data: { userEmail, loginTime: loginTime.toISOString() }
    });
  }

  async notifyLoginAttempt(userEmail: string, success: boolean, reason?: string) {
    // Esta notificación se envía a todos los administradores para monitoreo de seguridad
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    const notifications = [];
    for (const admin of admins) {
      const notification = await this.createNotification({
        userId: admin.id,
        title: success ? 'Inicio de Sesión Exitoso' : 'Intento de Inicio de Sesión Fallido',
        message: success 
          ? `Usuario ${userEmail} ha iniciado sesión correctamente.`
          : `Intento de inicio de sesión fallido para ${userEmail}. ${reason ? `Razón: ${reason}` : ''}`,
        type: 'ACCOUNT_SECURITY',
        channel: 'IN_APP',
        priority: success ? 'LOW' : 'HIGH',
        data: { userEmail, success, reason, timestamp: new Date().toISOString() }
      });
      notifications.push(notification);
    }

    return notifications;
  }

  async notifyStockLow(productId: string, productName: string, currentStock: number) {
    // Notificar a todos los administradores
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    const notifications = [];
    for (const admin of admins) {
      const notification = await this.createNotification({
        userId: admin.id,
        title: 'Stock Bajo',
        message: `El producto "${productName}" tiene solo ${currentStock} unidades en stock.`,
        type: 'STOCK_LOW',
        channel: 'EMAIL',
        priority: 'HIGH',
        data: { productId, productName, currentStock }
      });
      notifications.push(notification);
    }

    return notifications;
  }

  // Obtener notificaciones del usuario
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where: { userId } })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Marcar notificación como leída
  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { 
        id: notificationId,
        userId 
      },
      data: { 
        readAt: new Date(),
        status: 'READ'
      }
    });
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { 
        userId,
        readAt: null
      },
      data: { 
        readAt: new Date(),
        status: 'READ'
      }
    });
  }

  // Obtener contador de notificaciones no leídas
  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { 
        userId,
        readAt: null
      }
    });
  }
}

// Instancia singleton
export const notificationService = new NotificationService();
