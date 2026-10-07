import Budget from "../models/budget.model.js";
import Client from "../models/client.model.js";
import Notification from "../models/notification.model.js";
import BikePart from "../models/bikepart.model.js";

// Resumen del dashboard en una sola request y sin traer colecciones completas
export const getDashboardSummary = async (req, res) => {
    try {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const bikeWithOwner = {
            path: "bike_id",
            select: "brand model color serialNumber current_owner_id",
            populate: { path: "current_owner_id", select: "name surname" }
        };

        const [trabajosPendientes, pendientesRetiro, trabajosRecientes, totalClients, newClients, lowStock, notifications] =
            await Promise.all([
                Budget.countDocuments({ state: "iniciado" }),
                Budget.find({ state: "terminado" }).select("bike_id").populate(bikeWithOwner).lean(),
                Budget.find().sort({ creation_date: -1 }).limit(3)
                    .select("bike_id state total_ars creation_date").populate(bikeWithOwner).lean(),
                Client.countDocuments(),
                Client.countDocuments({ createdAt: { $gte: lastMonth } }),
                BikePart.countDocuments({ stock: { $lte: 5 } }),
                Notification.find().sort({ creation_date: -1 }).limit(3).lean()
            ]);

        res.json({ trabajosPendientes, pendientesRetiro, trabajosRecientes, totalClients, newClients, lowStock, notifications });
    } catch (err) {
        console.error("Error en dashboard: ", err.message);
        res.status(500).json({ error: "Error obteniendo el resumen" });
    }
};
