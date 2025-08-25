import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js'
import clientRoutes from './routes/client.routes.js';
import bikeRoutes from './routes/bike.routes.js';
import bikePartsRoutes from './routes/bikepart.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import cashRoutes from './routes/cash.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import serviceRoutes from './routes/service.routes.js';
import utilsRoutes from './routes/utils.routes.js';
import helmet from 'helmet';
import ticketRoutes from './routes/ticket.routes.js';

dotenv.config();
connectDB();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN}));
app.use(express.json({ limit: '10mb' }));

app.use('/api', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/bikeparts', bikePartsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/utils', utilsRoutes);
app.use('/api/tickets', ticketRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
})

export default app;