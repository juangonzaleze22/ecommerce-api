import express from 'express';
import { 
  scrapeMRWAgencies, 
  getAllAgencies, 
  searchAgenciesByCity, 
  getAgencyById 
} from '../controllers/agencyController';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.get('/', getAllAgencies);
router.get('/search', searchAgenciesByCity);
router.get('/scrape-mrw', scrapeMRWAgencies); // Esta debe ir ANTES de /:id
router.get('/:id', getAgencyById);

export default router; 