import express from 'express';
import {
    createClient,
    getClients,
    getClientsById,
    updateClient,
    deleteClient
} from '../controllers/client.controller.js';

const router = express.Router();

router.post('/', createClient);
router.get('/', getClients);
router.get('/:id', getClientsById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;