import Client from "../models/client.model.js";
import Bike from "../models/bike.model.js";
import Budget from "../models/budget.model.js";
import { searchRegex } from '../utils/query.js';

export const createClient = async (req, res) => {
    if (!req.body.name || !req.body.surname || !req.body.mobileNum) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const { name, surname, mobileNum } = req.body;
        const client = new Client({ name, surname, mobileNum });
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        if (error.code === 11000) { // llave duplicada (mobileNum con unique)
            return res.status(409).json({ error: "Mobile number already exists" });
        }
        res.status(500).json({ error: 'Error creating client' });
    }
};

export const getClients = async (req, res) => {
    try {
        //lo agregue para que se banque la busqueda en el navbar
        const { q, withBikes, limit } = req.query;
        const filter = q?.trim()
            ? { $or: [{ name: searchRegex(q) }, { surname: searchRegex(q) }, { mobileNum: searchRegex(q) }] }
            : {};

        // withBikes=1: clientes con sus bicis en una sola consulta (evita una request por cliente)
        if (withBikes === '1') {
            const clients = await Client.aggregate([
                { $match: filter },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: 'bikes', localField: '_id', foreignField: 'current_owner_id', as: 'bikes' } }
            ]);
            return res.json(clients);
        }

        let query = Client.find(filter).sort({ createdAt: -1 });
        if (limit) query = query.limit(Math.min(50, parseInt(limit) || 20));
        res.json(await query.lean());
    } catch (error) {
        res.status(500).json({ error: 'Error getting clients' });
    }
};

export const getClientsById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) return res.status(404).json({ error: "Client not found" });

        const bikes = await Bike.find({ current_owner_id: client._id });

        res.json({ client, bikes });
    } catch (error) {
        res.status(500).json({ error: 'Error getting client' });
    }
};

export const updateClient = async (req, res) => {
    try {
        const { name, surname, mobileNum } = req.body;
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            { name, surname, mobileNum },
            { new: true, runValidators: true }
        );

        if (!client) return res.status(404).json({ error: "Client not found" });

        const bikes = await Bike.find({ current_owner_id: client._id });

        res.json({
            ...client.toObject(),
            bikes
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "Mobile number already exists" });
        }
        res.status(500).json({ error: 'Error updating client' });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
        if (!client) return res.status(404).json({ error: "Client not found" });
        await Bike.deleteMany({ current_owner_id: req.params.id });
        res.json({ message: 'Client and bikes deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting client' });
    }
};