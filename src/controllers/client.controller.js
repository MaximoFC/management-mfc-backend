import Client from "../models/client.model.js";
import Bike from "../models/bike.model.js";

export const createClient = async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error creating client' });
    }
};

export const getClients = async (req, res) => {
    try {
        const clients = await Client.find();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error getting clients' });
    }
};

export const getClientsById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const bikes = await Bike.find({ client_id: client._id, active: true });
        res.json({ client, bikes });
    } catch (error) {
        res.status(500).json({ error: 'Error getting client' });
    }
};

export const updateClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Error updating client' });
    }
};

export const deleteClient = async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        await Bike.deleteMany({ client_id: req.params.id });
        res.json({ message: 'Client and bikes deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting client' });
    }
};