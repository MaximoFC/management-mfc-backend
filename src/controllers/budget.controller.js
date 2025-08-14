import Budget from '../models/budget.model.js';
import BikePart from '../models/bikepart.model.js';
import Service from '../models/service.model.js';
import Bike from '../models/bike.model.js';
import getDollarBlueRate from '../utils/getDollarRate.js';

export const createBudget = async (req, res) => {
  try {
    const { bike_id, employee_id, parts, services } = req.body;

    if (!parts?.length && !services?.length) {
      return res.status(400).json({ message: 'Debe incluir al menos una pieza o un servicio' });
    }

    const bike = await Bike.findById(bike_id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const dollarRate = await getDollarBlueRate();

    let total_usd = 0;

    // Procesar piezas con precios históricos
    const partItems = [];
    for (const item of parts) {
      const part = await BikePart.findById(item.bikepart_id);
      if (!part) return res.status(404).json({ message: 'BikePart not found' });

      const subtotal = part.price_usd * item.amount;
      total_usd += subtotal;

      partItems.push({
        bikepart_id: part._id,
        description: part.description,
        unit_price_usd: part.price_usd,
        amount: item.amount,
        subtotal_usd: subtotal
      });
    }

    // Procesar servicios con precios históricos
    const serviceItems = [];
    for (const item of services) {
      const service = await Service.findById(item.service_id);
      if (!service) return res.status(404).json({ message: 'Service not found' });

      total_usd += service.price_usd;

      serviceItems.push({
        service_id: service._id,
        name: service.name,
        description: service.description,
        price_usd: service.price_usd
      });
    }

    const total_ars = total_usd * dollarRate;

    const budget = new Budget({
      bike_id,
      client_at_creation: bike.current_owner_id,
      employee_id,
      currency: 'USD',
      dollar_rate_used: dollarRate,
      parts: partItems,
      services: serviceItems,
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
      .populate({
        path: 'bike_id',
        populate: { path: 'current_owner_id' }
      })
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
      .populate('parts.bikepart_id')
      .populate('services.service_id');

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

export const getBikeBudgets = async (req, res) => {
  try {
    const { id } = req.params;
    const budgets = await Budget.find({ bike_id: id })
      .populate('employee_id')
      .populate('parts.bikepart_id')
      .populate('services.service_id');
    
    res.json(budgets);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

export const getAllBudgetsOfClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const bikes = await Bike.find({
      $or: [
        { current_owner_id: clientId },
        { 'ownership_history.client_id': clientId }
      ]
    });

    const bikeIds = bikes.map(b => b._id);

    const budgets = await Budget.find({bike_id: {$in: bikeIds}})
      .populate('bike_id')
      .populate('employee_id')
      .sort({createdAt: -1});

    res.json({ budgets });
  } catch (error) {
    res.status(500).json({ error: 'Error getting all budgets of client' });
  }
};