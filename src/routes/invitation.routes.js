import Invitation from "../models/invitation.model.js";
import Employee from "../models/employee.model.js";
import bcrypt from "bcryptjs";

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

        // 🔥 limitar usuarios
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