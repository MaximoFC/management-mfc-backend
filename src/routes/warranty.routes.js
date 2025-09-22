import express from "express";
import mongoose from "mongoose";
import Budget from "../models/budget.model.js";

const router = express.Router();

router.get("/", async (req, res) => {
    const { client_id, bike_id } = req.query;

  try {
    if (!client_id || !bike_id) {
      return res.status(400).json({ error: "Faltan parámetros client_id o bike_id" });
    }

    if (!mongoose.Types.ObjectId.isValid(client_id) || !mongoose.Types.ObjectId.isValid(bike_id)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const budgets = await Budget.find({
      client_at_creation: new mongoose.Types.ObjectId(client_id),
      bike_id: new mongoose.Types.ObjectId(bike_id),
      "services.warranty.status": "activa",
      "services.warranty.startDate": { $lte: new Date() },
      "services.warranty.endDate": { $gte: new Date() }
    });

    const matchedServices = budgets.flatMap(b =>
      b.services
        .filter(s => {
          const w = s.warranty;
          return (
            w?.hasWarranty &&
            w.status === "activa" &&
            new Date() >= new Date(w.startDate) &&
            new Date() <= new Date(w.endDate)
          );
        })
        .map(s => ({
          serviceId: s.service_id?.toString(),
          endDate: s.warranty.endDate
        }))
    );

    res.json(matchedServices);
  } catch (err) {
    console.error("❌ Error al buscar garantías activas:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;
