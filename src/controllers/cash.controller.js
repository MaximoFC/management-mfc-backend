import Cash from "../models/cash.model.js";
import CashFlow from "../models/cashFlow.model.js";

//Obtener saldo de la caja
export const getBalance = async (req, res) => {
    try {
        const cash = await Cash.findOne() || await Cash.create({ balance: 0 });
        res.json({ balance: cash.balance });
    } catch (error) {
        console.error("Error getting cash balance: ", error);
        res.status(500).json({ error: 'Error getting cash balance' });
    }
};

//Ver historial de movimientos
export const flowList = async (req, res) => {
    try {
        const { start, end, page = 1, limit = 20 } = req.query;

        const query = {};

        if (start || end) {
            query.date = {};

            if (start) {
                const [y, m, d] = start.split("-");
                const startDate = new Date(y, m - 1, d);
                startDate.setHours(0, 0, 0, 0);
                query.date.$gte = startDate;
            }

            if (end) {
                const [y, m, d] = end.split("-");
                const endDate = new Date(y, m - 1, d); 
                endDate.setHours(23, 59, 59, 999);
                query.date.$lte = endDate;
            }
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            CashFlow.find(query)
                .sort({ date: -1 })
                .skip(skip)
                .limit(Number(limit)),
            CashFlow.countDocuments(query)
        ]);

        res.json({
            items,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error getting cash flow: ", error);
        res.status(500).json({ error: "Error getting cash flow" });
    }
};

//Crear movimiento
export const createFlow = async ({ type, amount, description, employee_id }) => {
    try {
        if(!['ingreso', 'egreso'].includes(type)) {
            throw new Error('Invalid type (ingreso/egreso)');
        }
        if (!amount || Number(amount) <= 0) {
            throw new Error("El monto debe ser mayor a 0");
        }

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0 || isNaN(numericAmount)) {
            throw new Error("El monto debe ser mayor a 0");
        }

        const cash = await Cash.findOne() || await Cash.create({ balance: 0 });

        const newBalance = 
            type === 'ingreso'
                ? cash.balance + numericAmount
                : cash.balance - numericAmount;

        const flow = new CashFlow({
            type,
            amount: numericAmount,
            description,
            employee_id: employee_id || null
        });

        cash.balance = newBalance;

        await Promise.all([cash.save(), flow.save()]);

        return { message: "Flow registered", flow, newBalance };
    } catch (error) {
        console.error("Error registering flow: ", error);
        throw error;
    }
};

export const createFlowEndpoint = async (req, res) => {
    try {
        const { type, amount, description, employee_id } = req.body;

        const result = await createFlow({ type, amount, description, employee_id });
        res.status(201).json(result);
    } catch (error) {
        console.error("Error registering flow (endpoint): ", error);
        res.status(500).json({ error: error.message });
    }
};

// Resumen de ingresos/egresos hoy, semana y mes
export const flowSummary = async (req, res) => {
    try {
        const now = new Date();

        // Hoy
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Semana (lunes a hoy)
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

        // Mes
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const makeSummary = async (start, end) => {
            const movements = await CashFlow.find({
                date: { $gte: start, $lte: end }
            });

            let ingresos = 0;
            let egresos = 0;

            movements.forEach(m => {
                if (m.type === "ingreso") ingresos += m.amount;
                else egresos += m.amount;
            });

            return {
                ingresos,
                egresos,
                balance: ingresos - egresos
            };
        };

        const [today, week, month] = await Promise.all([
            makeSummary(todayStart, todayEnd),
            makeSummary(weekStart, todayEnd),
            makeSummary(monthStart, todayEnd)
        ]);

        res.json({ today, week, month });
    } catch (error) {
        console.error("Error getting flow summary:", error);
        res.status(500).json({ error: "Error getting summary" });
    }
};