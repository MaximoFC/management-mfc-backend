import Service from "../models/service.model.js";
import BikePart from "../models/bikepart.model.js";

export const getBootstrapData = async (req, res) => {
    try {
        const services = await Service.find().sort({ name: 1 }).lean();
        const bikeparts = await BikePart.find().sort({ brand: 1 }).lean();

        res.json({
            services,
            bikeparts
        });
    } catch (err) {
        console.error("Error en bootstrap: ", err.message);
        res.status(500).json({ error: "Error obteniendo datos iniciales" });
    }
};