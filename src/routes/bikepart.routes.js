import express from 'express';

import {
  createBikeParts,
  deleteBikePart,
  getBikePartById,
  getBikeParts,
  updateBikePart
} from "../controllers/bikepart.controller.js"

const router = express.Router();

router.get('/', getBikeParts);
router.get('/:id', getBikePartById);
router.post('/', createBikeParts);
router.put('/:id', updateBikePart);
router.delete('/:id', deleteBikePart);

export default router