import express from 'express';
import { getProfile, 
    login,
    registerWithToken,
    forgotPassword,
    resetPassword 
} from '../controllers/auth.controller.js';
import { tokenVerify } from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attemps, please try again later' },
    standardHeaders: true,
    legacyHeaders: true
});

router.post('/login', loginLimiter, login);
router.get('/profile', tokenVerify, getProfile);
// Registro y recuperación: limitan intentos y envío de emails
const accountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos, probá de nuevo más tarde' },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/register', accountLimiter, registerWithToken);
router.post('/forgot-password', accountLimiter, forgotPassword);
router.post('/reset-password', accountLimiter, resetPassword);

export default router;