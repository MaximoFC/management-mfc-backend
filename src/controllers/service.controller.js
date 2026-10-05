import Service from '../models/service.model.js';
import { searchRegex, getPagination, paginate } from '../utils/query.js';

export const getAllServices = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q?.trim()
      ? { $or: [{ name: searchRegex(q) }, { description: searchRegex(q) }] }
      : {};

    const pagination = getPagination(req.query);
    if (pagination) return res.json(await paginate(Service, filter, pagination, { name: 1 }));

    const services = await Service.find(filter).sort({ name: 1 }).lean();
    res.json(services);
  } catch (err) {
    console.error("Error retrieving services: ", err.message);
    res.status(500).json({ error: 'Error retrieving services' });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    console.error("Error getting service by ID:", err.message);
    res.status(400).json({ error: 'Invalid ID' });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, price_ars } = req.body;
    if (!(Number(price_ars) > 0)) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    const newService = new Service({ name, description, price_ars: Number(price_ars) });
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { name, description, price_ars } = req.body;
    if (!(Number(price_ars) > 0)) return res.status(400).json({ error: 'El precio debe ser mayor a 0' });

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, price_ars: Number(price_ars) },
      { new: true, runValidators: true }
    );

    if (!updatedService) return res.status(404).json({ error: 'Service not found' });

    res.json(updatedService);
  } catch (err) {
    console.error("Error updating service:", err.message);
    res.status(400).json({ error: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Service not found' });

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting service:", err.message);
    res.status(400).json({ error: 'Invalid ID' });
  }
};