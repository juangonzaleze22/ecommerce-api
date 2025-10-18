import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { uploadBrandImage } from '../utils/fileUpload';
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
  getActiveBrands
} from '../controllers/brandController';

const router = express.Router();

// Rutas públicas
router.get('/', getBrands);
router.get('/active', getActiveBrands);
router.get('/:id', getBrandById);

// Rutas protegidas (solo admin)
router.post('/', protect, authorize('ADMIN'), uploadBrandImage.single('image'), createBrand);
router.put('/:id', protect, authorize('ADMIN'), uploadBrandImage.single('image'), updateBrand);
router.delete('/:id', protect, authorize('ADMIN'), deleteBrand);
router.put('/:id/toggle-status', protect, authorize('ADMIN'), toggleBrandStatus);

export default router; 