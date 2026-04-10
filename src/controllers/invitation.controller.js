import crypto from 'crypto';
import Invitation from '../models/invitation.model.js';

export const createInvitation = async (req, res) => {
    try {
        const { email } = req.body;

        const token = crypto.randomBytes(32).toString('hex');

        const invitation = await Invitation.create({
            email,
            token,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24 hs
        });

        const link = `http://localhost:5173/register?token=${token}`;

        res.json({ link });
    } catch ( error ) {
        res.status(500).json({ message: 'Error creating invitation', error: error.message });
    }
};