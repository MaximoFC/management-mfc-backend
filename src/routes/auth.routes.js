import express from 'express';
import { getProfile, login } from '../controllers/auth.controller.js';
import { tokenVerify } from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attemps, please try again later' },
    standardHeaders: true,
    legacyHeaders: true
});

router.post('/login', loginLimiter, login);
router.get('/profile', tokenVerify, getProfile);

export default router;