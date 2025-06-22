import Budget from '../models/budget.model.js';
import BikePart from '../models/bikepart.model.js';

export const createBudget = async (req, res) => {
  try {
    const { bike_id, employee_id, currency, parts } = req.body;

    let total_usd = 0;
    let total_ars = 0;

    for (const item of parts) {
      const part = await BikePart.findById(item.bikepart_id);
      if (!part) return res.status(404).json({ message: 'BikePart not found' });

      total_usd += part.price * item.amount;
    }

    if (currency === 'ARS') {
      total_ars = total_usd * 1000; 
    }

    const budget = new Budget({
      bike_id,
      employee_id,
      currency,
      parts,
      total_usd,
      total_ars,
      creation_date: new Date(),
      state: 'iniciado'
    });

    await budget.save();
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find()
      .populate('bike_id')
      .populate('employee_id')
      .populate('parts.bikepart_id');
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateBudgetState = async (req, res) => {
  try {
    const { id } = req.params;
    const { state, payment_date } = req.body;

    const budget = await Budget.findById(id).populate('parts.bikepart_id');
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    if (state === 'en proceso' && budget.state !== 'en proceso') {
      for (const item of budget.parts) {
        const part = await BikePart.findById(item.bikepart_id._id);
        if (!part) return res.status(404).json({ message: 'BikePart not found' });

        if (part.stock < item.amount) {
          return res.status(400).json({
            message: `Stock insuficiente para ${part.description}. Disponible: ${part.stock}, requerido: ${item.amount}`
          });
        }

        part.stock -= item.amount;
        await part.save();
      }
    }

    budget.state = state;
    if (state === 'pagado' && payment_date) {
      budget.payment_date = new Date(payment_date);
    }

    await budget.save();
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id)
      .populate('bike_id')
      .populate('employee_id')
      .populate('parts.bikepart_id');

    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByIdAndDelete(id);

    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
