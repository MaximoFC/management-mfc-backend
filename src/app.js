import express from 'express';
import cors from 'cors';
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
import compression from 'compression';
import ticketRoutes from './routes/ticket.routes.js';
import bootstrapRoutes from "./routes/bootstrap.routes.js";
import invitationRoutes from './routes/invitation.routes.js';
import { tokenVerify, isAdmin } from './middlewares/auth.middleware.js';

connectDB();

const app = express();

app.disable("etag");

app.set('trust proxy', 1);

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = process.env.CORS_ORIGIN.split(',');

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn("CORS blocked request from origin: ", origin);
        return callback(Object.assign(new Error("CORS not allowed"), { status: 403 }));
    },
    credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '200kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', tokenVerify, clientRoutes);
app.use('/api/bikes', tokenVerify, bikeRoutes);
app.use('/api/bikeparts', tokenVerify, bikePartsRoutes);
app.use('/api/budgets', tokenVerify, budgetRoutes);
app.use('/api/cash', tokenVerify, isAdmin, cashRoutes);
app.use('/api/notifications', tokenVerify, notificationRoutes);
app.use('/api/services', tokenVerify, serviceRoutes);
app.use('/api/utils', tokenVerify, utilsRoutes);
app.use('/api/tickets', tokenVerify, ticketRoutes);
app.use("/api/bootstrap", bootstrapRoutes);
app.use('/api/invitations', invitationRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error("Error: ", err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

export default app;