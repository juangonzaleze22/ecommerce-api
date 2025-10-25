import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getBestSellers,
  getBestDiscounts,
  searchProducts,
  cleanupOrphanedImages,
  toggleProductStatus,
  getRelatedProducts
} from '../controllers/productController';
import { protect, authorize } from '../middleware/auth';
import { uploadProductImagesWithErrorHandling } from '../utils/fileUpload';

const router = Router();

// Rutas públicas (opcionalmente autenticadas para filtrado por rol)
router.get('/', getProducts);
router.get('/bestsellers', getBestSellers);
router.get('/bestdiscounts', getBestDiscounts);
router.get('/search', searchProducts);
router.get('/related/:id', getRelatedProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorize('ADMIN'), uploadProductImagesWithErrorHandling, createProduct);
router.put('/:id', protect, authorize('ADMIN'), uploadProductImagesWithErrorHandling, updateProduct);
router.delete('/:id', protect, authorize('ADMIN'), deleteProduct);
router.put('/:id/toggle-status', protect, authorize('ADMIN'), toggleProductStatus);
router.post('/cleanup-orphaned-images', protect, authorize('ADMIN'), cleanupOrphanedImages);

export default router; 