import express from 'express';
import { getProfile, login } from '../controllers/auth.controller.js';
import { tokenVerify } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', tokenVerify, getProfile);

export default router;