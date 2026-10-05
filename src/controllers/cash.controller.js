import Cash from "../models/cash.model.js";
import CashFlow from "../models/cashFlow.model.js";

// Argentina no tiene horario de verano: UTC-3 todo el año.
// El servidor (Railway) corre en UTC, así que las fechas se arman explícitamente en hora argentina.
const AR_OFFSET = "-03:00";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const startOfDayAR = (ymd) => new Date(`${ymd}T00:00:00.000${AR_OFFSET}`);
const endOfDayAR = (ymd) => new Date(`${ymd}T23:59:59.999${AR_OFFSET}`);

// Fecha de hoy en Argentina como "AAAA-MM-DD"
const todayAR = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

//Obtener saldo de la caja
export const getBalance = async (req, res) => {
    try {
        const cash = await Cash.findOne().lean();
        res.json({ balance: cash?.balance || 0 });
    } catch (error) {
        console.error("Error getting cash balance: ", error);
        res.status(500).json({ error: 'Error getting cash balance' });
    }
};

// Historial de movimientos, siempre paginado (máximo 50 por página)
export const flowList = async (req, res) => {
    try {
        const { start, end } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

        if ((start && !DATE_RE.test(start)) || (end && !DATE_RE.test(end))) {
            return res.status(400).json({ error: "Formato de fecha inválido (AAAA-MM-DD)" });
        }

        const query = {};
        if (start || end) {
            query.date = {};
            if (start) query.date.$gte = startOfDayAR(start);
            if (end) query.date.$lte = endOfDayAR(end);
        }

        const [items, total, totals] = await Promise.all([
            CashFlow.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            CashFlow.countDocuments(query),
            CashFlow.aggregate([
                { $match: query },
                { $group: { _id: "$type", total: { $sum: "$amount" } } }
            ])
        ]);

        const ingresos = totals.find(t => t._id === "ingreso")?.total || 0;
        const egresos = totals.find(t => t._id === "egreso")?.total || 0;

        res.json({
            items,
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit)),
            // Totales de todo el rango filtrado, no solo de la página
            totals: { ingresos, egresos, balance: ingresos - egresos }
        });
    } catch (error) {
        console.error("Error getting cash flow: ", error);
        res.status(500).json({ error: "Error getting cash flow" });
    }
};

//Crear movimiento
export const createFlow = async ({ type, amount, description, employee_id }) => {
    if (!['ingreso', 'egreso'].includes(type)) {
        throw Object.assign(new Error('Tipo inválido (ingreso/egreso)'), { status: 400 });
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw Object.assign(new Error("El monto debe ser mayor a 0"), { status: 400 });
    }

    const flow = await CashFlow.create({
        type,
        amount: numericAmount,
        description,
        employee_id: employee_id || null
    });

    // $inc atómico: dos movimientos simultáneos no se pisan el saldo
    const cash = await Cash.findOneAndUpdate(
        {},
        { $inc: { balance: type === 'ingreso' ? numericAmount : -numericAmount } },
        { upsert: true, new: true }
    );

    return { message: "Flow registered", flow, newBalance: cash.balance };
};

export const createFlowEndpoint = async (req, res) => {
    try {
        const { type, amount, description } = req.body;
        if (!description?.trim()) {
            return res.status(400).json({ error: "La descripción es obligatoria" });
        }

        const result = await createFlow({ type, amount, description: description.trim(), employee_id: req.user.id });
        res.status(201).json(result);
    } catch (error) {
        if (!error.status) console.error("Error registering flow (endpoint): ", error);
        res.status(error.status || 500).json({ error: error.message });
    }
};

// Resumen de ingresos/egresos hoy, semana y mes (en hora argentina)
export const flowSummary = async (req, res) => {
    try {
        const today = todayAR();
        const [y, m, d] = today.split("-").map(Number);

        // Lunes de esta semana (0 = domingo)
        const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        const monday = new Date(Date.UTC(y, m - 1, d - ((dayOfWeek + 6) % 7))).toISOString().slice(0, 10);
        const firstOfMonth = `${today.slice(0, 8)}01`;
        const end = endOfDayAR(today);

        // Suma en la base en lugar de traer todos los movimientos a memoria
        const makeSummary = async (fromYmd) => {
            const totals = await CashFlow.aggregate([
                { $match: { date: { $gte: startOfDayAR(fromYmd), $lte: end } } },
                { $group: { _id: "$type", total: { $sum: "$amount" } } }
            ]);
            const ingresos = totals.find(t => t._id === "ingreso")?.total || 0;
            const egresos = totals.find(t => t._id === "egreso")?.total || 0;
            return { ingresos, egresos, balance: ingresos - egresos };
        };

        const [todaySummary, week, month] = await Promise.all([
            makeSummary(today),
            makeSummary(monday),
            makeSummary(firstOfMonth)
        ]);

        res.json({ today: todaySummary, week, month });
    } catch (error) {
        console.error("Error getting flow summary:", error);
        res.status(500).json({ error: "Error getting summary" });
    }
};
