import crypto from 'crypto';
import Invitation from '../models/invitation.model.js';
import Employee from '../models/employee.model.js';
import { sendEmail } from "../services/email.service.js";

export const createInvitation = async (req, res) => {
    try {
        const email = String(req.body.email || "").toLowerCase().trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "Email inválido" });
        }

        const count = await Employee.countDocuments();
        if (count >= 2) {
            return res.status(403).json({ error: "User limit reached" });
        }

        const existingUser = await Employee.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Una invitación vencida no bloquea volver a invitar
        const existingInvite = await Invitation.findOne({ email, used: false, expiresAt: { $gt: new Date() } });
        if (existingInvite) {
            return res.status(400).json({ error: "Invitation already sent" });
        }

        const token = crypto.randomBytes(32).toString('hex');

        const invitation = await Invitation.create({
            email,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        });

        const link = `${process.env.FRONTEND_URL}/register?token=${token}`;

        await sendEmail({
            to: email,
            subject: "Invitación a MFC Management",
            html: `
                <h2>Te invitaron al sistema</h2>
                <p>Hacé click en el siguiente link para crear tu cuenta:</p>
                <a href="${link}">Crear cuenta</a>
                <p>Este enlace expira en 24 horas.</p>
            `
        });

        res.json({ message: "Invitation sent" });

    } catch (error) {
        console.error("INVITATION ERROR:", error);
        res.status(500).json({ message: 'Error creating invitation' });
    }
};