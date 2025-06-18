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
router.get('/', createBikeParts);
router.get('/:id', updateBikePart);
router.get('/:id', deleteBikePart);

export default router