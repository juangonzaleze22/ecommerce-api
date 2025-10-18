import express, { RequestHandler } from 'express';
import { protect, authorize } from '../middleware/auth';
import { uploadComprobanteWithErrorHandling } from '../utils/fileUpload';
import {
  createOrder,
  getOrderById,
  getOrdersByUser,
  updateOrderStatus,
  updatePaymentStatus,
  getAllOrders
} from '../controllers/orderController';

const router = express.Router();

// Rutas protegidas
router.post('/', protect as unknown as RequestHandler, uploadComprobanteWithErrorHandling as unknown as RequestHandler, createOrder as unknown as RequestHandler);
// Importante: rutas específicas antes que rutas parametrizadas genéricas
router.get('/user/:id', protect as unknown as RequestHandler, getOrdersByUser as unknown as RequestHandler);
router.get('/:id', protect as unknown as RequestHandler, getOrderById as unknown as RequestHandler);
router.put('/:id/status', protect as unknown as RequestHandler, authorize('ADMIN') as unknown as RequestHandler, updateOrderStatus as unknown as RequestHandler);
router.put('/:id/payment-status', protect as unknown as RequestHandler, authorize('ADMIN') as unknown as RequestHandler, updatePaymentStatus as unknown as RequestHandler);

// Rutas de admin
router.get('/', protect as unknown as RequestHandler, authorize('ADMIN') as unknown as RequestHandler, getAllOrders as unknown as RequestHandler);

// Simulación de pago: permite a cualquier usuario marcar su orden como pagada
router.put('/:id/simulate-payment', protect, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Simulación de pago completada. La orden está pendiente de validación del comprobante.' 
  });
});

export default router; 