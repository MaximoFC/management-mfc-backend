import Employee from '../models/employee.model.js';
import jwt from 'jsonwebtoken'

export const tokenVerify = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Invalid token format" });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "undefined" || token === "null") {
        return res.status(401).json({ error: "Invalid or missing token" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }

    // El usuario tiene que seguir existiendo y el token ser posterior al último cambio de contraseña
    try {
        const employee = await Employee.findById(decoded.id).select('role passwordChangedAt').lean();
        const issuedAt = decoded.iat * 1000;
        if (!employee || (employee.passwordChangedAt && employee.passwordChangedAt.getTime() > issuedAt)) {
            return res.status(401).json({ error: 'Session expired' });
        }
        req.user = { ...decoded, role: employee.role };
        next();
    } catch (error) {
        next(error);
    }
};

// tokenVerify ya cargó el rol desde la base (no desde el token)
export const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
};
