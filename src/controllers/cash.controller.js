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
        res.status(500).json({ error: 'Error getting cash balance' });
    }
};

//Ver historial de movimientos
export const flowList = async (req, res) => {
    try {
        const flow = await CashFlow.find().sort({ date: -1 });
        res.json(flow);
    } catch (error) {
        res.status(500).json({ error: 'Error getting cash flow' });
    }
}

//Crear movimiento
export const createFlow = async (req, res) => {
    try {
        const { type, amount, description, employee_id } = req.body;
        if(!['ingreso', 'egreso'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type' });
        }

        let cash = await Cash.findOne();
        if (!cash) {
            cash = await Cash.create({ balance: 0 });
        }

        const newBalance = type === 'ingreso'
            ? cash.balance + amount
            : cash.balance - amount;

        if (newBalance < 0) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        cash.balance = newBalance;
        await cash.save();

        const flow = new CashFlow({
            type,
            amount,
            description,
            employee_id: employee_id || null
        });

        await flow.save();

        res.status(201).json({ message: 'Flow registered', flow, newBalance });
    } catch (error) {
        res.status(500).json({ error: 'Error registering flow' });
    }
};