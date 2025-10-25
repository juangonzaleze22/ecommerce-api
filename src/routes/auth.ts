import express, { RequestHandler } from 'express';
import { 
  register, 
  login, 
  getMe, 
  createDefaultAdmin, 
  updateProfile, 
  updateProfileImage,
  getUserShippingAgencies,
  addUserShippingAgency,
  removeUserShippingAgency,
  setDefaultShippingAgency
} from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../utils/fileUpload';

const router = express.Router();

// Public routes
router.post('/register', upload.single('profileImage'), register);
router.post('/login', login);

// Admin routes
router.post('/create-admin', protect, authorize('ADMIN'), upload.single('profileImage'), createDefaultAdmin);

// Protected routes
router.get('/me', protect, getMe as unknown as RequestHandler);
router.put('/profile', protect, upload.single('profileImage'), updateProfile as unknown as RequestHandler);
router.put('/updateprofileimage', protect, upload.single('profileImage'), updateProfileImage as unknown as RequestHandler);

// User shipping agencies routes
router.get('/shipping-agencies', protect, getUserShippingAgencies as unknown as RequestHandler);
router.post('/shipping-agencies', protect, addUserShippingAgency as unknown as RequestHandler);
router.delete('/shipping-agencies/:id', protect, removeUserShippingAgency as unknown as RequestHandler);
router.put('/shipping-agencies/:id/set-default', protect, setDefaultShippingAgency as unknown as RequestHandler);

export default router; 