import express from 'express';
import {
    getBikes,
    createBike,
    updateBike,
    disableBike,
    transferBike,
    getBikeBudgets
} from '../controllers/bike.controller.js';

const router = express.Router();

router.get('/', getBikes)
router.post('/', createBike);
router.put('/:id', updateBike);
router.delete('/:id', disableBike);
router.put('/transfer/:bikeId', transferBike); //Put para transferencias de bicis
router.get('/:bikeId/history', getBikeBudgets); //Get de historial de servicios de bicis

export default router;