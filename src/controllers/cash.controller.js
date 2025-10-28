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
        const flow = await CashFlow.find()
            .sort({ date: -1 });
        res.json(flow);
    } catch (error) {
        console.error("Error getting cash flow: ", error);
        res.status(500).json({ error: 'Error getting cash flow' });
    }
}

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
}