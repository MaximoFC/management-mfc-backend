import Client from "../models/client.model.js";
import Bike from "../models/bike.model.js";
import Budget from "../models/budget.model.js";

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
        //lo agregue para que se banque la busqueda en el navbar
        const { q } = req.query;
        let filter = {};
        if (q) {
            filter = {
                $or: [
                    { name: new RegExp(q, 'i') },
                    { surname: new RegExp(q, 'i') },
                    { mobileNum: new RegExp(q, 'i') },
                ]
            };
        }
        const clients = await Client.find(filter);
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: 'Error getting clients' });
    }
};


export const getClientsById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        const bikes = await Bike.find({ current_owner_id: client._id, active: true });

        const bikeIds = bikes.map(b => b._id);
        const budgets = await Budget.find({ bike_id: { $in: bikeIds } }).sort({ createdAt: -1 });

        res.json({ client, bikes, budgets });
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
        await Bike.deleteMany({ current_owner_id: req.params.id });
        res.json({ message: 'Client and bikes deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting client' });
    }
};