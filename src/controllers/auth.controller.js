import Employee from "../models/employee.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
    const { name, password } = req.body;

    try {
        const employee = await Employee.findOne({ name });
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