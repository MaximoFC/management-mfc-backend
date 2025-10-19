import express from 'express';
import {
    getBalance,
    flowList,
    createFlowEndpoint
} from '../controllers/cash.controller.js';

const router = express.Router();

router.get('/balance', getBalance);
router.get('/flow', flowList);
router.post('/flow', createFlowEndpoint);

export default router;