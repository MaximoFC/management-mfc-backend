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

const router = express.Router();

// --- Endpoints principales ---
router.post('/', createBudget);
router.get('/', getAllBudgets);
router.get('/client/:clientId', getAllBudgetsOfClient);

// --- Endpoint de garantías activas (antes de /:id) ---
router.get("/active-warranties", async (req, res) => {
  const { client_id, bike_id } = req.query;

  try {
    if (!client_id || !bike_id) {
      return res.status(400).json({ error: "Faltan parámetros client_id o bike_id" });
    }

    if (!mongoose.Types.ObjectId.isValid(client_id) || !mongoose.Types.ObjectId.isValid(bike_id)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const budgets = await Budget.find({
      client_at_creation: client_id,
      bike_id: bike_id
    }).lean();

    const matchedServices = budgets.flatMap(b =>
      (b.services || [])
        .filter(s => {
          const w = s.warranty;
          return w?.hasWarranty && w.status === "activa" &&
            new Date() >= new Date(w.startDate) &&
            new Date() <= new Date(w.endDate);
        })
        .map(s => ({
          serviceId: s.service_id?.toString(),
          endDate: s.warranty.endDate
        }))
    );
    res.json(matchedServices);

  } catch (err) {
    console.error("❌ Error al buscar garantías activas:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas que requieren :id ---
router.get('/:id', getBudgetById);
router.put('/:id', updateBudgetState);
router.delete('/:id', deleteBudget);

export default router;
