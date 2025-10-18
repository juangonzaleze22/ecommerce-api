import { RequestHandler, Router } from 'express';
import { 
  getUserNotifications,
  getAllUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas del usuario
router.get('/', getUserNotifications as unknown as RequestHandler);
router.get('/all', getAllUserNotifications as unknown as RequestHandler);
router.get('/unread-count', getUnreadCount as unknown as RequestHandler);
router.put('/:id/read', markAsRead as unknown as RequestHandler);
router.put('/mark-all-read', markAllAsRead as unknown as RequestHandler);
router.delete('/:id', deleteNotification as unknown as RequestHandler);

export default router;
