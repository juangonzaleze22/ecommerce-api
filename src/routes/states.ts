import express from 'express';
import {
  getStates,
  getStateById,
  createState,
  updateState,
  deleteState
} from '../controllers/stateController';

const router = express.Router();

// Route: /api/states
router.route('/')
  .get(getStates)
  .post(createState);

// Route: /api/states/:id
router.route('/:id')
  .get(getStateById)
  .put(updateState)
  .delete(deleteState);

export default router; 