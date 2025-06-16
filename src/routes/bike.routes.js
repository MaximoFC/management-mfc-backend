import express from 'express';
import {
    createBike,
    disableBike
} from '../controllers/bike.controller.js';

const router = express.Router();

router.post('/', createBike);
router.delete('/:id', disableBike);

export default router;