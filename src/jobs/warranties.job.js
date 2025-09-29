import cron from "node-cron";
import Budget from "../models/budget.model.js";
import Notification from "../models/notification.model.js";

cron.schedule("0 0 * * *", async () => {
    console.log("Verificando garantías...");
    const notificationsToCreate = [];

    try {
        const now = new Date();
        const budgets = await Budget.find({ "services.warranty.status": "activa" })
            .populate("bike_id", "brand model")
            .populate("bike_id.current_owner_id", "name surname");

        for (const budget of budgets) {
            let modified = false;

            for (const service of budget.services) {
                const warranty = service.warranty;
                if (warranty?.status === "activa") {
                    
                    // 1. Expirar si ya terminó el período de garantía
                    if (warranty.endDate && warranty.endDate < now) {
                        warranty.status = "expirada";
                        modified = true;
                    }

                    // 2. Revisar cada checkup
                    if (warranty.checkups?.length) {
                        for (const check of warranty.checkups) {
                            // 2a. Notificación una semana antes
                            const oneWeekBefore = new Date(check.date);
                            oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);

                            if (!check.notified && now >= oneWeekBefore && now < check.date) {
                                notificationsToCreate.push({
                                    type: "reminder",
                                    message_body: `El servicio de ${service.name} de la bicicleta ${budget.bike_id.brand} ${budget.bike_id.model} del cliente ${budget.bike_id.current_owner_id.name} ${budget.bike_id.current_owner_id.surname} necesita revisión de garantía en una semana.`,
                                    budget_id: budget._id,
                                    service_id: service.service_id,
                                });
                                check.notified = true;
                                modified = true;
                            }

                            // 2b. Expirar garantía si pasó la fecha y no se completó
                            if (now > check.date && !check.completed) {
                                warranty.status = "expirada";
                                modified = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (modified) {
                await budget.save();
            }
        }

        if (notificationsToCreate.length) {
            await Notification.insertMany(notificationsToCreate);
        }

        console.log(`Revisadas: ${budgets.length}, Expiradas: ${expiredCount}, Notificaciones: ${notificationsToCreate.length}`);
    } catch (error) {
        console.error("Warranty cron error", error);
    }
});
