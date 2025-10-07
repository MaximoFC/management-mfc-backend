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
    const results = await BikePart.find({
      $or: [
        { code: new RegExp(q, "i") },
        { brand: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { category: new RegExp(q, "i") }
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