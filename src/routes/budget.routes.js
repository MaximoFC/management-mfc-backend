import express from 'express';
import { generateBudgetPdf } from '../services/pdf/budgetPdf.service.js';

import {
  getBudgetById,
  getAllBudgets,
  deleteBudget,
  updateBudgetState,
  createBudget,
  getAllBudgetsOfClient
} from '../controllers/budget.controller.js';

const router = express.Router();

router.post('/generate-pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateBudgetPdf(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=presupuesto.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF', error);
  }
});
router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/client/:clientId', getAllBudgetsOfClient);
router.put('/:id', updateBudgetState);
router.get('/:id', getBudgetById);
router.delete('/:id', deleteBudget);

export default router;