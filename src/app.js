import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js'
import clientRoutes from './routes/client.routes.js';
import bikeRoutes from './routes/bike.routes.js';
import bikePartsRoutes from './routes/bikepart.routes.js';
import budgetRoutes from './routes/budget.routes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/bikeparts', bikePartsRoutes);
app.use('/api/budgets', budgetRoutes);

export default app;