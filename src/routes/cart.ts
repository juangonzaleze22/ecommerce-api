import { Router, RequestHandler } from 'express';
import {
  getCart,
  addToCart,
  updateCart,
  removeFromCart
} from '../controllers/cartController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect as unknown as RequestHandler, getCart as unknown as RequestHandler);
router.post('/add', protect as unknown as RequestHandler, addToCart as unknown as RequestHandler);
router.put('/update', protect as unknown as RequestHandler, updateCart as unknown as RequestHandler);
router.delete('/remove', protect as unknown as RequestHandler, removeFromCart as unknown as RequestHandler);

export default router; 