import mongoose from "mongoose"; 
import Bike from "../models/bike.model.js";

export const createBike = async (req, res) => {
    try {
        const bike = new Bike(req.body);
        await bike.save();
        res.status(201).json(bike);
    } catch (error) {
        res.status(500).json({ error: 'Error creating bike' });
    }
};

export const disableBike = async (req, res) => {
    try {
        const bike = await Bike.findById(req.params.id);
        if (!bike) {
            return res.status(404).json({ error: 'Bike not found' });
        }

        bike.active = false;
        await bike.save();

        res.json({ message: 'Disabled bike', bike });
    } catch (error) {
        res.status(500).json({ error: 'Error disabling bike' });
    }
};

// Trae las bicis (ayuda a la filtracion por id para añadir bikes)
export const getBikes = async (req, res) => {
    try {
        const query = {};
        if (req.query.client_id) {
            query.client_id = new mongoose.Types.ObjectId(req.query.client_id);
        }
        const bikes = await Bike.find(query);
        res.json(bikes);
    } catch (error) {
        res.status(500).json({ error: 'Error getting bikes' });
    }
};
