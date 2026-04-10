import Employee from "../models/employee.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Invitation from "../models/invitation.model.js";

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const employee = await Employee.findOne({ email });
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

        const invitation = await Invitation.findOne({ token });

        if (!invitation || invitation.used) {
            return res.status(403).json({ error: "Invalid invitation" });
        }

        if (invitation.expiresAt < Date.now()) {
            return res.status(403).json({ error: "Invitation expired" });
        }

        // limitar usuarios
        const count = await Employee.countDocuments();
        if (count >= 2) {
            return res.status(403).json({ error: "User limit reached" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const employee = await Employee.create({
            name,
            email: invitation.email,
            password: hashedPassword,
            role: count === 0 ? "admin" : "employee"
        });

        invitation.used = true;
        await invitation.save();

        res.json({ message: "User created" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Register error" });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await Employee.findOne({ email });

        if (!user) return res.json({ message: "OK" }); // no revelar info

        const token = crypto.randomBytes(32).toString('hex');

        user.resetToken = token;
        user.resetTokenExpires = Date.now() + 1000 * 60 * 15; // 15 min
        await user.save();

        const link = `http://localhost:5173/reset-password?token=${token}`;

        console.log("RESET LINK:", link);

        res.json({ message: "Email sent" });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }   
};

export const resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        const user = await Employee.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired token" });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;

        await user.save();

        res.json({ message: "Password updated" });

    } catch (err) {
        res.status(500).json({ error: "Error" });
    }
};