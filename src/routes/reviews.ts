import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  moderateReview
} from '../controllers/reviewController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/products/:id/reviews', getProductReviews);
router.post('/products/:id/reviews', protect, createReview);
router.put('/reviews/:id/moderation', protect, authorize('ADMIN'), moderateReview);

export default router; 