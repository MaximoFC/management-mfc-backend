import Cash from "../models/cash.model.js";
import CashFlow from "../models/cashFlow.model.js";

//Obtener saldo de la caja
export const getBalance = async (req, res) => {
    try {
        let cash = await Cash.findOne();
        if (!cash) {
            cash = await Cash.create({ balance: 0 });
        }
        res.json({ balance: cash.balance });
    } catch (error) {
        console.error("Error getting cash balance: ", error);
        res.status(500).json({ error: 'Error getting cash balance' });
    }
};

//Ver historial de movimientos
export const flowList = async (req, res) => {
    try {
        const flow = await CashFlow.find()
            .sort({ date: -1 });
        res.json(flow);
    } catch (error) {
        console.error("Error getting cash flow: ", error);
        res.status(500).json({ error: 'Error getting cash flow' });
    }
}

//Crear movimiento
export const createFlow = async (req, res) => {
    try {
        const { type, amount, description, employee_id } = req.body;

        if(!['ingreso', 'egreso'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type (ingreso/egreso)' });
        }
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: "El monto debe ser mayor a 0" });
        }

        let cash = await Cash.findOne();
        if (!cash) {
            cash = await Cash.create({ balance: 0 });
        }

        const numericAmount = Number(amount);
        const newBalance = 
            type === 'ingreso'
                ? cash.balance + numericAmount
                : cash.balance - numericAmount;

        const flow = new CashFlow({
            type,
            amount,
            description,
            employee_id: employee_id || null
        });

        cash.balance = newBalance;

        await Promise.all([cash.save(), flow.save()]);

        res.status(201).json({
            message: "Flow registered",
            flow,
            newBalance
        });
    } catch (error) {
        console.error("Error registering flow: ", error);
        res.status(500).json({ error: 'Error registering flow' });
    }
};