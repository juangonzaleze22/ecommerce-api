import { Request, Response } from 'express';
import { RequestWithUser } from '../types/interfaces';
import { prisma } from '../config/database';

// Obtener notificaciones del usuario
export const getUserNotifications = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    let whereClause: any = { userId };
    
    if (unreadOnly) {
      whereClause.readAt = null;
    }
    
    // Asegurar que solo se devuelvan notificaciones con status SENT o DELIVERED
    whereClause.status = {
      in: ['SENT', 'DELIVERED', 'READ']
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching notifications', 
      error 
    });
  }
};

// Obtener contador de notificaciones no leídas
export const getUnreadCount = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const count = await prisma.notification.count({
      where: { 
        userId,
        readAt: null,
        status: {
          in: ['SENT', 'DELIVERED', 'READ'] as any[]
        }
      }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching unread count', 
      error 
    });
  }
};

// Marcar notificación como leída
export const markAsRead = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await prisma.notification.updateMany({
      where: { 
        id,
        userId 
      },
      data: { 
        readAt: new Date(),
        status: 'READ'
      }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not authorized'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking notification as read', 
      error 
    });
  }
};

// Marcar todas las notificaciones como leídas
export const markAllAsRead = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        readAt: null
      },
      data: { 
        readAt: new Date(),
        status: 'READ'
      }
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking all notifications as read', 
      error 
    });
  }
};

// Obtener todas las notificaciones (leídas y no leídas)
export const getAllUserNotifications = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const whereClause = { 
      userId,
      status: {
        in: ['SENT', 'DELIVERED', 'READ'] as any[]
      }
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.notification.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching all notifications', 
      error 
    });
  }
};

// Eliminar notificación
export const deleteNotification = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await prisma.notification.deleteMany({
      where: { 
        id,
        userId 
      }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or not authorized'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting notification', 
      error 
    });
  }
};
