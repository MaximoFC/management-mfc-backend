import express from 'express';

import {
  getBudgetById,
  getAllBudgets,
  deleteBudget,
  updateBudgetState,
  createBudget,
  getAllBudgetsOfClient
} from '../controllers/budget.controller.js';

const router = express.Router();

router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/client/:clientId', getAllBudgetsOfClient);
router.put('/:id', updateBudgetState);
router.get('/:id', getBudgetById);
router.delete('/:id', deleteBudget);

export default router;