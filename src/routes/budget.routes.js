// budget.routes.js
import express from 'express';
import {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudgetState,
  deleteBudget,
  getAllBudgetsOfClient,
  getActiveWarranties,
  generatePdf,
  updateBudgetItems
} from '../controllers/budget.controller.js';

const router = express.Router();

// --- Endpoints principales ---
router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/client/:clientId', getAllBudgetsOfClient);
router.get("/active-warranties", getActiveWarranties);
router.post("/generate-pdf", generatePdf);

// --- Rutas que requieren :id ---
router.get('/:id', getBudgetById);
router.put('/:id', updateBudgetState);
router.put("/:id/edit", updateBudgetItems);
router.delete('/:id', deleteBudget);

export default router;
