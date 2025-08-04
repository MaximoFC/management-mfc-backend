import mongoose from "mongoose"; 
import Bike from "../models/bike.model.js";
import Client from "../models/client.model.js";
import Budget from "../models/budget.model.js";

export const createBike = async (req, res) => {
    try {
        console.log("Create bike body: ", req.body);
        const bike = new Bike(req.body);
        await bike.save();
        res.status(201).json(bike);
    } catch (error) {
        console.error(error);
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
            query.current_owner_id = new mongoose.Types.ObjectId(req.query.client_id);
        }
        const bikes = await Bike.find(query);
        res.json(bikes);
    } catch (error) {
        res.status(500).json({ error: 'Error getting bikes' });
    }
};

export const transferBike = async (req, res) => {
    try {
        const { bikeId } = req.params;
        const { new_client_id } = req.body;

        const newClient = await Client.findById(new_client_id);
        if (!newClient) {
            return res.status(404).json({ message: 'New client not found' });
        }

        const bike = await Bike.findById(bikeId);
        if (!bike) {
            return res.status(404).json({ message: 'Bike not found' });
        }

        // Agregar al historial de dueños anteriores
        bike.ownership_history.push({
            client_id: bike.current_owner_id,
            from: bike.createdAt,
            to: new Date()
        });

        bike.current_owner_id = new mongoose.Types.ObjectId(new_client_id);

        await bike.save();
        await bike.populate('current_owner_id ownership_history.client_id');

        res.json({ message: 'Successful transfer', bike });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getBikeBudgets = async (req, res) => {
    try {
        const { bikeId } = req.params;

        const budgets = await Budget.find({ bike_id: bikeId }).populate('bike_id').populate('employee_id');

        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving bike budgets', error: error.message });
    }
};