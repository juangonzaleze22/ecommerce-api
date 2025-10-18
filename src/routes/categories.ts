import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { uploadCategoryImage } from '../utils/fileUpload';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  getActiveCategories
} from '../controllers/categoryController';

const router = express.Router();

// Rutas públicas
router.get('/', getCategories);
router.get('/active', getActiveCategories);
router.get('/:id', getCategoryById);

// Rutas protegidas (solo admin)
router.post('/', protect, authorize('ADMIN'), uploadCategoryImage.single('image'), createCategory);
router.put('/:id', protect, authorize('ADMIN'), uploadCategoryImage.single('image'), updateCategory);
router.delete('/:id', protect, authorize('ADMIN'), deleteCategory);
router.put('/:id/toggle-status', protect, authorize('ADMIN'), toggleCategoryStatus);

export default router; 