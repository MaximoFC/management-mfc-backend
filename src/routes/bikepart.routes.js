import express from 'express';

import BikePart from '../models/bikepart.model.js';
import {
  createBikeParts,
  deleteBikePart,
  getBikePartById,
  getBikeParts,
  updateBikePart
} from "../controllers/bikepart.controller.js"

const router = express.Router();

router.get('/', getBikeParts);
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const regex = new RegExp(q, "i");
    const results = await BikePart.find({
      $or: [
        { code: regex },
        { brand: regex },
        { description: regex },
        { category: regex }
      ]
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/:id', getBikePartById);
router.post('/', createBikeParts);
router.put('/:id', updateBikePart);
router.delete('/:id', deleteBikePart);

export default router