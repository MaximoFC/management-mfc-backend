import Budget from '../models/budget.model.js';
import BikePart from '../models/bikepart.model.js';
import Service from '../models/service.model.js';
import Bike from '../models/bike.model.js';
import getDollarBlueRate from '../utils/getDollarRate.js';
import mongoose from 'mongoose';
import { generateBudgetPdf } from '../services/pdf/budgetPdf.service.js';
import { createFlow } from './cash.controller.js';
import { calculateBudget } from "../utils/budgetCalculator.js";

const WARRANTY_MONTHS = 6;
const CHECKUP_MONTHS = 3;

// Estados en los que el stock de las piezas ya fue descontado
const STOCK_TAKEN_STATES = ['en proceso', 'terminado', 'pagado', 'retirado'];
// Al borrar, solo se devuelve stock si la bici todavía no se retiró ni se cobró
const STOCK_RETURNABLE_STATES = ['en proceso', 'terminado'];

const httpError = (status, message) => Object.assign(new Error(message), { status });

const sendError = (res, err, context) => {
  if (err.name === 'VersionError') {
    return res.status(409).json({ message: 'El presupuesto fue modificado por otra acción. Recargá la página.' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Identificador inválido' });
  }
  if (!err.status) console.error(context, err);
  res.status(err.status || 500).json({ message: err.message });
};

const populateDetail = (query) => query
  .populate({
    path: "bike_id",
    select: "brand model color serialNumber current_owner_id",
    populate: { path: "current_owner_id", select: "name surname mobileNum" }
  })
  .populate('employee_id', 'name surname')
  .populate('parts.bikepart_id', 'description')
  .populate('services.service_id', 'name description price_ars');

// Agrupa [{bikepart_id, amount}] en Map(id -> cantidad total)
const groupParts = (parts) => {
  const map = new Map();
  for (const p of parts) {
    const id = String(p.bikepart_id?._id || p.bikepart_id);
    map.set(id, (map.get(id) || 0) + Number(p.amount || 0));
  }
  return map;
};

const returnStock = (map) => Promise.all(
  [...map].map(([id, amount]) => BikePart.updateOne({ _id: id }, { $inc: { stock: amount } }))
);

// Descuenta stock de forma atómica; si alguna pieza no alcanza, revierte lo ya descontado
const takeStock = async (map) => {
  const taken = new Map();
  try {
    for (const [id, amount] of map) {
      const updated = await BikePart.findOneAndUpdate(
        { _id: id, stock: { $gte: amount } },
        { $inc: { stock: -amount } }
      );
      if (!updated) {
        const part = await BikePart.findById(id).lean();
        throw httpError(400, part
          ? `Stock insuficiente para ${part.description}. Disponible: ${part.stock}, requerido: ${amount}`
          : `Repuesto ${id} no encontrado`);
      }
      taken.set(id, amount);
    }
  } catch (err) {
    await returnStock(taken);
    throw err;
  }
};

// Garantías vigentes de una bici. La garantía sigue a la bicicleta, no al dueño.
const findActiveWarranties = async (bike_id) => {
  const now = new Date();
  const budgets = await Budget.find({
    bike_id,
    services: { $elemMatch: {
      'warranty.status': 'activa',
      'warranty.startDate': { $lte: now },
      'warranty.endDate': { $gte: now }
    } }
  }).lean();

  return budgets.flatMap(b => b.services
    .filter(s => s.warranty?.status === 'activa' && s.warranty.startDate <= now && s.warranty.endDate >= now)
    .map(s => ({ serviceId: String(s.service_id), budgetId: b._id, endDate: s.warranty.endDate })));
};

// Crear presupuesto
export const createBudget = async (req, res) => {
  try {
    const { bike_id, services = [], bikeparts = [], applyWarranty = [] } = req.body;

    if (!bikeparts?.length && !services?.length) {
      return res.status(400).json({ message: 'Debe incluir al menos una pieza o un servicio' });
    }

    const bike = await Bike.findById(bike_id).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const [dollarRate, activeWarranties, partsDocs, servicesDocs] = await Promise.all([
      getDollarBlueRate(),
      findActiveWarranties(bike_id),
      Promise.all(bikeparts.map(p => BikePart.findById(p.bikepart_id).lean())),
      Promise.all(services.map(s => Service.findById(s.service_id).lean()))
    ]);

    const { parts, services: serviceItems, total_usd, total_ars, currency } = calculateBudget({
      bikepartsInput: bikeparts,
      servicesInput: services,
      partsDocs,
      servicesDocs,
      activeWarranties,
      applyWarranty: applyWarranty.map(String),
      dollarRate
    });

    const budget = await Budget.create({
      bike_id,
      client_at_creation: bike.current_owner_id,
      employee_id: req.user.id,
      currency,
      dollar_rate_used: dollarRate,
      parts,
      services: serviceItems,
      total_usd,
      total_ars,
      creation_date: new Date(),
      state: 'iniciado'
    });

    res.status(201).json(budget);
  } catch (err) {
    sendError(res, err, 'Error creating budget:');
  }
};

// Obtener todos los presupuestos
export const getAllBudgets = async (req, res) => {
  try {
    // ?states=iniciado,en proceso permite no traer el historial completo (ej. retirados)
    const states = req.query.states?.split(',').filter(Boolean);
    const budgets = await Budget.find(states?.length ? { state: { $in: states } } : {})
      .populate({
        path: 'bike_id',
        select: 'brand model color serialNumber current_owner_id',
        populate: { path: 'current_owner_id', select: 'name surname mobileNum' }
      })
      .populate('employee_id', 'name surname')
      .populate('parts.bikepart_id', 'description')
      .lean();

    res.json(budgets);
  } catch (err) {
    sendError(res, err, 'Error getting budgets:');
  }
};

const VALID_TRANSITIONS = {
  iniciado: ['en proceso', 'terminado', 'pagado', 'retirado'],
  'en proceso': ['terminado', 'pagado', 'retirado'],
  terminado: ['pagado', 'retirado'],
  pagado: ['retirado'],
  retirado: []
};

// Actualizar estado del presupuesto
export const updateBudgetState = async (req, res) => {
  try {
    const { state: next, giveWarranty, warrantyServices } = req.body;

    const original = await Budget.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ message: 'Budget not found' });

    const current = original.state;
    if (current === next) {
      return res.status(400).json({ message: `El presupuesto ya se encuentra en estado "${next}"` });
    }
    if (!VALID_TRANSITIONS[current]?.includes(next)) {
      return res.status(400).json({ message: `Transición no permitida: no se puede pasar de ${current} a ${next}.` });
    }

    // Tomar el cambio de estado de forma atómica: si llegan dos pedidos iguales (doble clic),
    // solo uno encuentra el estado anterior; el otro recibe 409 y no descuenta stock ni cobra dos veces.
    const budget = await Budget.findOneAndUpdate(
      { _id: original._id, state: current },
      { $set: { state: next }, $inc: { __v: 1 } },
      { new: true }
    );
    if (!budget) {
      return res.status(409).json({ message: 'El presupuesto ya fue actualizado por otra acción. Recargá la página.' });
    }

    const stockMap = groupParts(original.parts);
    const takesStock = current === 'iniciado';
    let stockTaken = false;
    let flowAmount = 0;

    try {
      if (takesStock) {
        await takeStock(stockMap);
        stockTaken = true;
      }

      // La garantía puede darse al terminar, cobrar o retirar, aunque se salteen estados
      if (giveWarranty && ['terminado', 'pagado', 'retirado'].includes(next)) {
        const selected = (Array.isArray(warrantyServices) ? warrantyServices : []).map(String);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + WARRANTY_MONTHS);
        const firstCheck = new Date(startDate);
        firstCheck.setMonth(firstCheck.getMonth() + CHECKUP_MONTHS);

        for (const service of budget.services) {
          if (selected.includes(String(service.service_id)) && !service.warranty?.hasWarranty) {
            service.warranty = {
              hasWarranty: true,
              startDate,
              endDate,
              checkups: [{ date: firstCheck, notified: false, completed: false }],
              status: 'activa'
            };
          }
        }
      }

      // Retirar sin pasar por "pagado" implica cobro en el momento; si ya se pagó no se duplica
      const charges = next === 'pagado' || (next === 'retirado' && !original.payment_date);
      if (charges) {
        budget.payment_date = new Date();
        // Un presupuesto cubierto 100% por garantía puede quedar en $0: no genera movimiento
        flowAmount = budget.total_ars > 0 ? budget.total_ars : 0;
      }

      await budget.save();

      // El ingreso se registra al final, cuando todo lo demás ya quedó guardado
      if (flowAmount > 0) {
        const bike = await Bike.findById(budget.bike_id).populate('current_owner_id', 'name surname').lean();
        const client = bike?.current_owner_id;
        const clientName = client ? `${client.name} ${client.surname}`.trim() : 'Cliente desconocido';
        await createFlow({
          type: 'ingreso',
          amount: flowAmount,
          description: `Pago recibido por presupuesto de ${clientName}`,
          employee_id: req.user.id
        });
      }
    } catch (err) {
      // Volver el presupuesto a como estaba y devolver el stock descontado
      const restore = { $set: { state: current, services: original.services }, $inc: { __v: 1 } };
      if (original.payment_date) restore.$set.payment_date = original.payment_date;
      else restore.$unset = { payment_date: "" };
      await Budget.updateOne({ _id: original._id }, restore);
      if (stockTaken) await returnStock(stockMap);
      throw err;
    }

    res.json(budget);
  } catch (err) {
    sendError(res, err, 'Error updating state:');
  }
};

// Marcar un checkup de garantía como realizado
export const completeCheckup = async (req, res) => {
  try {
    const { serviceId, checkupDate } = req.body;
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });

    const service = budget.services.find(s => String(s.service_id) === String(serviceId));
    const warranty = service?.warranty;
    if (warranty?.status !== 'activa') {
      return res.status(400).json({ message: 'El servicio no tiene una garantía activa' });
    }

    const checkup = warranty.checkups.find(c => c.date.getTime() === new Date(checkupDate).getTime());
    if (!checkup) return res.status(404).json({ message: 'Revisión no encontrada' });

    checkup.completed = true;
    await budget.save();
    res.json(await populateDetail(Budget.findById(budget._id)).lean());
  } catch (err) {
    sendError(res, err, 'Error completing checkup:');
  }
};

// Anular una garantía (ej. el cliente la perdió por llevar la bici a otro taller)
export const voidWarranty = async (req, res) => {
  try {
    const { serviceId } = req.body;
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });

    const service = budget.services.find(s => String(s.service_id) === String(serviceId));
    if (service?.warranty?.status !== 'activa') {
      return res.status(400).json({ message: 'El servicio no tiene una garantía activa' });
    }

    service.warranty.status = 'anulada';
    await budget.save();
    res.json(await populateDetail(Budget.findById(budget._id)).lean());
  } catch (err) {
    sendError(res, err, 'Error voiding warranty:');
  }
};

// Obtener por ID
export const getBudgetById = async (req, res) => {
  try {
    const budget = await populateDetail(Budget.findById(req.params.id)).lean();
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    res.json(budget);
  } catch (err) {
    sendError(res, err, 'Error getting budget:');
  }
};

// Eliminar presupuesto
export const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    if (STOCK_RETURNABLE_STATES.includes(budget.state)) await returnStock(groupParts(budget.parts));
    res.json({ message: 'Presupuesto eliminado correctamente' });
  } catch (err) {
    sendError(res, err, 'Error deleting budget:');
  }
};

// Presupuestos de un cliente
export const getAllBudgetsOfClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const bikes = await Bike.find({
      $or: [
        { current_owner_id: clientId },
        { 'ownership_history.client_id': clientId }
      ]
    }).lean();

    const bikeIds = bikes.map(b => b._id);
    const budgets = await Budget.find({ bike_id: { $in: bikeIds } })
      .populate('bike_id', 'brand model color serialNumber')
      .populate('employee_id', 'name surname')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ budgets });
  } catch (error) {
    res.status(500).json({ error: 'Error getting all budgets of client' });
  }
};

// Garantías activas: solo presupuestos con algún servicio en garantía vigente,
// y de cada uno solo esos servicios
export const getActiveWarranties = async (req, res) => {
  try {
    const { client_id, bike_id } = req.query;
    const now = new Date();
    const isActive = (w) => w?.status === 'activa' && w.startDate <= now && w.endDate >= now;

    const query = {
      services: { $elemMatch: {
        'warranty.status': 'activa',
        'warranty.startDate': { $lte: now },
        'warranty.endDate': { $gte: now }
      } }
    };

    // La garantía sigue a la bici: el filtro por cliente usa sus bicis actuales
    if (bike_id && mongoose.Types.ObjectId.isValid(bike_id)) {
      query.bike_id = bike_id;
    } else if (client_id && mongoose.Types.ObjectId.isValid(client_id)) {
      const bikes = await Bike.find({ current_owner_id: client_id }).select('_id').lean();
      query.bike_id = { $in: bikes.map(b => b._id) };
    }

    const budgets = await Budget.find(query)
      .populate({
        path: "bike_id",
        select: "brand model color serialNumber current_owner_id",
        populate: { path: "current_owner_id", select: "name surname mobileNum" }
      })
      .populate("services.service_id", "name description")
      .lean();

    res.json(budgets.map(b => ({ ...b, services: b.services.filter(s => isActive(s.warranty)) })));
  } catch (err) {
    sendError(res, err, 'Error getting active warranties:');
  }
};

// Quitar o añadir servicios y repuestos
export const updateBudgetItems = async (req, res) => {
  try {
    const { services = [], bikeparts = [] } = req.body;

    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: "Budget not found" });

    if (["pagado", "retirado"].includes(budget.state)) {
      return res.status(400).json({ message: "No se pueden editar presupuestos pagados o retirados" });
    }
    if (!bikeparts.length && !services.length) {
      return res.status(400).json({ message: 'Debe incluir al menos una pieza o un servicio' });
    }

    const [partsDocs, servicesDocs] = await Promise.all([
      Promise.all(bikeparts.map((p) => BikePart.findById(p.bikepart_id).lean())),
      Promise.all(services.map((s) => Service.findById(s.service_id).lean()))
    ]);

    const { parts, services: serviceItems, total_usd, total_ars } = calculateBudget({
      bikepartsInput: bikeparts,
      servicesInput: services,
      partsDocs,
      servicesDocs,
      existingBudget: budget,
      dollarRate: budget.dollar_rate_used
    });

    // El stock solo se ajusta si ya se había descontado (presupuesto fuera de "iniciado")
    const toTake = new Map();
    const toReturn = new Map();
    if (STOCK_TAKEN_STATES.includes(budget.state)) {
      const current = groupParts(budget.parts);
      const wanted = groupParts(parts);
      for (const id of new Set([...current.keys(), ...wanted.keys()])) {
        const diff = (wanted.get(id) || 0) - (current.get(id) || 0);
        if (diff > 0) toTake.set(id, diff);
        if (diff < 0) toReturn.set(id, -diff);
      }
    }

    await takeStock(toTake);
    try {
      budget.parts = parts;
      budget.services = serviceItems;
      budget.total_usd = total_usd;
      budget.total_ars = total_ars;
      await budget.save();
    } catch (err) {
      await returnStock(toTake);
      throw err;
    }
    await returnStock(toReturn);

    await budget.populate([
      { path: "parts.bikepart_id" },
      { path: "services.service_id" }
    ]);

    res.json({
      message: "Presupuesto actualizado correctamente",
      budget,
    });
  } catch (err) {
    sendError(res, err, "Error updating budget items: ");
  }
};

// Generar PDF
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
