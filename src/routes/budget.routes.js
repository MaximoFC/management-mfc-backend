// budget.routes.js
import express from 'express';
import mongoose from 'mongoose';
import Budget from '../models/budget.model.js';
import {
  createBudget,
  getAllBudgets,
  getBudgetById,
  updateBudgetState,
  deleteBudget,
  getAllBudgetsOfClient
} from '../controllers/budget.controller.js';
import { generateBudgetPdf } from '../services/pdf/budgetPdf.service.js';

const router = express.Router();

// --- Endpoints principales ---
router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/client/:clientId', getAllBudgetsOfClient);

// --- Endpoint de garantías activas (antes de /:id) ---
router.get("/active-warranties", async (req, res) => {
  try {
    const { client_id, bike_id } = req.query;
    const today = new Date();

    const query = {
      services: {
        $elemMatch: {
          "warranty.status": "activa",
          "warranty.startDate": { $lte: today },
          "warranty.endDate": { $gte: today },
        },
      },
    };

    if (client_id && mongoose.Types.ObjectId.isValid(client_id)) {
      query.client_at_creation = client_id;
    }

    if (bike_id && mongoose.Types.ObjectId.isValid(bike_id)) {
      query.bike_id = bike_id;
    }

    const budgets = await Budget.find(query)
      .populate({
        path: "bike_id",
        populate: { path: "current_owner_id" },
      })
      .lean();

    const sanitizedBudgets = budgets.map((b) => ({
      ...b,
      services: (b.services || []).filter((s) => {
        const w = s.warranty;
        return (
          w?.hasWarranty &&
          w.status === "activa" &&
          new Date(w.startDate) <= today &&
          new Date(w.endDate) >= today
        );
      }),
    }));

    res.json(sanitizedBudgets);
  } catch (err) {
    console.error("Error al buscar garantías activas:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-pdf', async (req, res) => {
  try {
    const pdfBuffer = await generateBudgetPdf(req.body);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=presupuesto.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando PDF de presupuesto:", error);
    res.status(500).send('Error generating Budget PDF');
  }
});

// --- Rutas que requieren :id ---
router.get('/:id', getBudgetById);
router.put('/:id', updateBudgetState);
router.delete('/:id', deleteBudget);

export default router;
