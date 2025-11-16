import express from 'express';
import {
    getBalance,
    flowList,
    createFlowEndpoint,
    flowSummary
} from '../controllers/cash.controller.js';

const router = express.Router();

router.get('/balance', getBalance);
router.get('/flow/summary', flowSummary);
router.get('/flow', flowList);
router.post('/flow', createFlowEndpoint);

export default router;