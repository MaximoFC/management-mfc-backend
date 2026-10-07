import mongoose from "mongoose"; 
import Bike from "../models/bike.model.js";
import Client from "../models/client.model.js";
import Budget from "../models/budget.model.js";

// Número de serie opcional: vacío = sin número (no se guarda "" para no chocar con el índice único)
const normalizeSerial = (value) => {
    const serial = String(value ?? "").trim();
    return serial || undefined;
};

const SERIAL_TAKEN = "Ya existe una bicicleta con ese número de serie";

export const createBike = async (req, res) => {
    const { brand, model, current_owner_id } = req.body;

    if (!brand || !model || !current_owner_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const owner = await Client.findById(current_owner_id);
        if (!owner) {
            return res.status(404).json({ error: "Owner client not found" });
        }

        // Solo campos editables: el historial y el estado activo los maneja el sistema
        const { color } = req.body;
        const bike = new Bike({ brand, model, color, serialNumber: normalizeSerial(req.body.serialNumber), current_owner_id });
        await bike.save();
        res.status(201).json(bike);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: SERIAL_TAKEN });
        }
        res.status(500).json({ error: 'Error creating bike' });
    }
};

// Editar datos de una bici (marca, modelo, color, número de serie). El dueño se cambia con /transfer.
export const updateBike = async (req, res) => {
    try {
        const { brand, model, color } = req.body;
        if (!brand?.trim() || !model?.trim()) {
            return res.status(400).json({ error: "Marca y modelo son obligatorios" });
        }

        const serialNumber = normalizeSerial(req.body.serialNumber);
        const update = { $set: { brand: brand.trim(), model: model.trim(), color: color?.trim() || "" } };
        if (serialNumber) update.$set.serialNumber = serialNumber;
        else update.$unset = { serialNumber: "" };

        const bike = await Bike.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!bike) return res.status(404).json({ error: "Bike not found" });
        res.json(bike);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: SERIAL_TAKEN });
        if (error.name === 'CastError') return res.status(400).json({ error: "Identificador inválido" });
        res.status(500).json({ error: 'Error updating bike' });
    }
};

export const disableBike = async (req, res) => {
    try {
        const bike = await Bike.findByIdAndUpdate(
            req.params.id,
            { active: false },
            { new: true }
        );

        if (!bike) {
            return res.status(404).json({ error: 'Bike not found' });
        }

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
            if (!mongoose.Types.ObjectId.isValid(req.query.client_id)) {
                return res.status(400).json({ error: 'client_id inválido' });
            }
            query.current_owner_id = new mongoose.Types.ObjectId(req.query.client_id);
        }

        const bikes = await Bike.find(query)
            .populate("current_owner_id", "name surname mobileNum")
            .sort({ createdAt: -1 })
            .lean();

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
        res.status(500).json({ message: error.message || "Error transferring bike"});
    }
};

export const getBikeBudgets = async (req, res) => {
    try {
        const { bikeId } = req.params;

        const budgets = await Budget.find({ bike_id: bikeId })
            .populate("bike_id", "brand model color serialNumber")
            .populate("employee_id", "name surname")
            .sort({ createdAt: -1 })
            .lean();

        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving bike budgets', error: error.message });
    }
};