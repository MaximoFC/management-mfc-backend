import Service from "../models/service.model.js";
import BikePart from "../models/bikepart.model.js";
import Client from "../models/client.model.js";
import Bike from "../models/bike.model.js";

export const getBootstrapData = async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 }).lean();
    const bikeparts = await BikePart.find().sort({ brand: 1 }).lean();
    const clients = await Client.find().sort({ name: 1, surname: 1 }).lean();
    const bikes = await Bike.find().sort({ brand: 1, model: 1 }).lean();

    res.json({
      services,
      bikeparts,
      clients,
      bikes,
    });
  } catch (err) {
    console.error("Error en bootstrap: ", err.message);
    res.status(500).json({ error: "Error obteniendo datos iniciales" });
  }
};
