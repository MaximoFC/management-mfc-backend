import Employee from "../models/employee.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Invitation from "../models/invitation.model.js";
import { sendEmail } from "../services/email.service.js";

const MIN_PASSWORD_LENGTH = 8;

// Usuarios viejos pueden tener el email guardado con mayúsculas: buscar tal cual y normalizado
const emailVariants = (email) => {
    const raw = String(email ?? "").trim();
    return { $in: [raw, raw.toLowerCase()] };
};

const invalidPassword = (password) =>
    typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH;

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (typeof password !== "string") return res.status(400).json({ error: 'Invalid credentials' });

        const employee = await Employee.findOne({ email: emailVariants(email) }).select('+password');
        if (!employee) return res.status(400).json({ error:'Invalid credentials' });

        const passwordOk = await bcrypt.compare(password, employee.password);
        if (!passwordOk) return res.status(400).json({ error:'Invalid credentials' });

        const token = jwt.sign(
            { id: employee._id, role: employee.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            employee: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                role: employee.role
            }
        });
    } catch (error) {
        console.error('Login error: ', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getProfile = async (req, res) => {
    try {
        const employee = await Employee.findById(req.user.id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        res.json({
            id: employee._id,
            name: employee.name,
            role: employee.role
        });
    } catch (error) {
        console.error('Error getting profile: ', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const registerWithToken = async (req, res) => {
    try {
        const { token, name, password } = req.body;

        if (invalidPassword(password)) {
            return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
        }
        if (!name?.trim()) {
            return res.status(400).json({ error: "El nombre es obligatorio" });
        }

        // Marcar la invitación como usada de forma atómica: dos registros simultáneos no pueden usar el mismo token
        const invitation = await Invitation.findOneAndUpdate(
            { token: String(token), used: false, expiresAt: { $gt: new Date() } },
            { used: true }
        );

        if (!invitation) {
            return res.status(403).json({ error: "Invalid or expired invitation" });
        }

        // limitar usuarios
        const count = await Employee.countDocuments();
        const existingUser = await Employee.findOne({ email: invitation.email.toLowerCase() });

        if (count >= 2 || existingUser) {
            await Invitation.updateOne({ _id: invitation._id }, { used: false });
            return res.status(existingUser ? 400 : 403).json({ error: existingUser ? "User already exists" : "User limit reached" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const employee = await Employee.create({
            name: name.trim(),
            email: invitation.email,
            password: hashedPassword,
            role: count === 0 ? "admin" : "employee"
        });
        
        res.json({ message: "User created" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Register error" });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const okResponse = { message: "Si el email está registrado, te enviamos un link para recuperar la contraseña" };
        const user = await Employee.findOne({ email: emailVariants(email) });

        if (!user) return res.json(okResponse); // misma respuesta: no revelar qué emails existen

        const token = crypto.randomBytes(32).toString('hex');

        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 1000 * 60 * 15; // 15 min
        await user.save();

        const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await sendEmail({
            to: email,
            subject: "Recuperar contraseña",
            html: `
                <h2>Recuperación de contraseña</h2>
                <p>Hacé click en el siguiente link para cambiar tu contraseña:</p>
                <a href="${link}">Restablecer contraseña</a>
                <p>Este enlace expira en 15 minutos.</p>
            `
        });

        res.json(okResponse);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }   
};

export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        if (invalidPassword(password)) {
            return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` });
        }

        const user = await Employee.findOne({
            resetToken: String(token),
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        // -1s: el iat del JWT se redondea a segundos y un login inmediato no debe quedar invalidado
        user.passwordChangedAt = new Date(Date.now() - 1000);

        await user.save();

        res.json({ message: "Password updated" });

    } catch (err) {
        res.status(500).json({ error: "Error" });
    }
};