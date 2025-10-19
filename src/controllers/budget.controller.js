import Budget from '../models/budget.model.js';
import Cashflow from "../models/cashFlow.model.js";
import BikePart from '../models/bikepart.model.js';
import Service from '../models/service.model.js';
import Bike from '../models/bike.model.js';
import getDollarBlueRate from '../utils/getDollarRate.js';
import mongoose from 'mongoose';
import { generateBudgetPdf } from '../services/pdf/budgetPdf.service.js';
import { createFlow } from './cash.controller.js';

export const createBudget = async (req, res) => {
  try {
    const { bike_id, employee_id, services = [], bikeparts = [], applyWarranty = [] } = req.body;

    if (!bikeparts?.length && !services?.length) {
      return res.status(400).json({ message: 'Debe incluir al menos una pieza o un servicio' });
    }

    const bike = await Bike.findById(bike_id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const dollarRate = await getDollarBlueRate();

    let total_usd = 0;

    const pastBudgets = await Budget.find({ bike_id, client_at_creation: bike.current_owner_id }).populate('services.service_id');

    const activeWarranties = [];
    for (const b of pastBudgets) {
      for (const s of b.services) {
        if (s.warranty?.status === 'activa' && s.warranty.endDate && s.warranty.endDate > new Date()) {
          activeWarranties.push({
            serviceId: String(s.service_id?._id || s.service_id),
            budgetId: b._id,
            endDate: s.warranty.endDate
          });
        }
      }
    }

    // Procesar piezas con precios históricos
    const partItems = [];
    for (const item of bikeparts) {
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

      let price = service.price_usd;
      let coveredBy = null;

      // Solo aplicar garantía si el usuario lo decidió en el frontend
      const match = activeWarranties.find(w => w.serviceId === String(service._id));
      const userWantsWarranty = applyWarranty.includes(String(service._id));

      if (match && userWantsWarranty) {
        price = 0;
        coveredBy = match.budgetId;
      }

      total_usd += price;

      serviceItems.push({
        service_id: service._id,
        name: service.name,
        description: service.description,
        price_usd: price,
        covered_by_warranty: coveredBy
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

export const getBudgets = async (req, res) => {
  try {
    const { warranty } = req.query;

    let query = {};
    if (warranty === "active") {
      query = { "services.warranty.status": "activa" };
    }

    const budgets = await Budget.find(query)
      .populate({
        path: "bike_id",
        populate: { path: "current_owner_id" },
      });

    const filteredBudgets = warranty === "active"
      ? budgets.filter(b =>
          b.services.some(s => s.warranty?.status === "activa")
        )
      : budgets;

    res.json(filteredBudgets);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener presupuestos" });
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
    const { state, payment_date, giveWarranty, warrantyServices, employee_id = null } = req.body;

    const budget = await Budget.findById(id)
      .populate('parts.bikepart_id')
      .populate('services.service_id');
    if (!budget) return res.status(404).json({ message: 'Budget not found' });

    const validWarrantyServices = Array.isArray(warrantyServices)
      ? warrantyServices.map(String)
      : [];

    const current = budget.state;
    const next = state;

    //Transiciones válidas
    const validTransitions = {
      iniciado: ['en proceso', 'terminado', 'pagado', 'retirado'],
      'en proceso': ['terminado', 'pagado', 'retirado'],
      terminado: ['pagado', 'retirado'],
      pagado: ['retirado'],
      retirado: []
    };

    if (!validTransitions[current]?.includes(next)) {
      return res.status(400).json({
        message: `Transición no permitida: no se puede pasar de ${current} a ${next}.`
      });
    }

    //Funciones auxiliares
    const discountStock = async () => {
      for (const item of budget.parts) {
        const part = await BikePart.findById(item.bikepart_id._id);
        if (!part) throw new Error('Bikepart not found');
        if (part.stock < item.amount) {
          throw new Error(
            `Stock insuficiente para ${part.description}. Disponible: ${part.stock}, requerido: ${item.amount}`
          );
        }
        part.stock -= item.amount;
        await part.save();
      }

      for (const item of budget.parts) {
        const part = await BikePart.findById(item.bikepart_id._id);
        part.stock -= item.amount;
        await part.save();
      }
    };

    const registerPayment = async (budget, employee_id = null) => {
      if (!budget) throw new Error("Budget not found");

      const amount = budget.total_ars || (budget.total_usd * budget.dollar_rate_used);
      const bike = await Bike.findById(budget.bike_id).populate('current_owner_id');
      const client = bike?.current_owner_id;
      const clientName = client ? `${client.name} ${client.surname}`.trim() : 'Cliente desconocido';

      await createFlow({
        type: 'ingreso',
        amount,
        description: `Pago recibido por presupuesto de ${clientName}`,
        employee_id
      });

      budget.payment = { status: 'pagado', date: new Date() };
    };

    const createWarranty = async () => {
      if (!giveWarranty) return;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 6);

      const firstCheck = new Date(startDate);
      firstCheck.setMonth(firstCheck.getMonth() + 3);

      for (const service of budget.services) {
        const serviceIdStr = String(service.service_id._id);
        if (validWarrantyServices.includes(serviceIdStr)) {
          service.warranty = {
            hasWarranty: true,
            startDate,
            endDate,
            checkups: [{ date: firstCheck, notified: false, completed: false }],
            status: 'activa'
          };
        }
      }
    };

    if (current === 'iniciado' && next === 'en proceso') {
      await discountStock();
    }

    if (current === 'iniciado' && next === 'terminado') {
      await discountStock();
      createWarranty();
    }

    if (current === 'iniciado' && next === 'pagado') {
      await discountStock();
      await registerPayment(budget, employee_id);
    }

    if (current === 'iniciado' && next === 'retirado') {
      await discountStock();
      await registerPayment(budget, employee_id);
      createWarranty();
      budget.delivery_date = new Date();
    }

    if (current === 'en proceso' && next === 'pagado') {
      await registerPayment(budget, employee_id);
    }

    if (current === 'en proceso' && next === 'terminado') {
      createWarranty();
    }

    if (current === 'terminado' && next === 'pagado') {
      await registerPayment(budget, employee_id);
    }

    if (current === 'pagado' && next === 'retirado') {
      budget.delivery_date = new Date();
    }

    budget.state = next;
    await budget.save();

    res.json(budget);
  } catch (err) {
    console.error('Error updating state: ', err);
    res.status(500).json({ message: err.message });
  }
};

export const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findById(id)
      .populate({
        path: "bike_id",
        populate: {path: "current_owner_id"}
      })
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

export const getActiveWarranties = async (req, res) => {
  try {
    const { client_id, bike_id } = req.query;
    const today = new Date();

    let query = {
      "services.warranty.status": "activa",
      "services.warranty.startDate": { $lte: today },
      "services.warranty.endDate": { $gte: today }
    };

    if (client_id && mongoose.Types.ObjectId.isValid(client_id)) {
      query.client_at_creation = client_id;
    }

    if (bike_id && mongoose.Types.ObjectId.isValid(bike_id)) {
      query.bike_id = bike_id;
    }

    const budgets = await Budget.find(query)
      .populate({
        path: "bike_id",
        populate: { path: "current_owner_id" }
      })
      .populate("services.service_id");

    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const generatePdf = async (req, res) => {
  try {
    const pdfBuffer = await generateBudgetPdf(req.body);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=presupuesto.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Error generando PDF" });
  }
};