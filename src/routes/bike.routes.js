import express from 'express';
import {
    getBikes,
    createBike,
    disableBike,
} from '../controllers/bike.controller.js';

const router = express.Router();

router.get('/', getBikes)
router.post('/', createBike);
router.delete('/:id', disableBike);

export default router;