import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Empleado from '../models/employee.model.js';

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const passwordHash = await bcrypt.hash('TallerParaguay1674', 10);

const admin = new Empleado({
    name: "FacundoCallejas",
    password: passwordHash,
    role: 'admin'
});

await admin.save();
console.log('🟢 Admin creado');
process.exit();
