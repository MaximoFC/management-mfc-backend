import express from 'express';

import {
  getBudgetById,
  getAllBudgets,
  deleteBudget,
  updateBudgetState,
  createBudget
} from '../controllers/budget.controller.js';

const router = express.Router();

router.post('/', createBudget);
router.get('/', getAllBudgets);
router.put('/:id', updateBudgetState);
router.get('/:id', getBudgetById);
router.delete('/:id', deleteBudget);

export default router;