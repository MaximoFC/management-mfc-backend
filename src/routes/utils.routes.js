import express from 'express';
import getDollarBlueRate from '../utils/getDollarRate.js';

const router = express.Router();

router.get('/dollar-blue', async (req, res) => {
    try {
        const value = await getDollarBlueRate();
        res.json({ value });
    } catch (error) {
        res.status(500).json({error: 'Error getting dollar rate'});
    }
});

export default router;