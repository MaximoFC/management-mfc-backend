// Migración única: pasa los servicios del catálogo de USD a ARS.
// Uso: node --env-file=.env scripts/migrate-services-to-ars.js [cotizacion]
// Si no se pasa cotización, usa el dólar blue actual. Solo toca servicios sin price_ars.
import mongoose from "mongoose";
import Service from "../src/models/service.model.js";
import getDollarBlueRate from "../src/utils/getDollarRate.js";

const rate = Number(process.argv[2]) || await getDollarBlueRate();
await mongoose.connect(process.env.MONGODB_URI);

const services = await Service.find({ price_ars: { $exists: false }, price_usd: { $gt: 0 } });
for (const s of services) {
  s.price_ars = Math.round(s.price_usd * rate);
  await s.save();
  console.log(`${s.name}: USD ${s.price_usd} -> ARS ${s.price_ars}`);
}

console.log(`Cotización usada: ${rate}. Servicios migrados: ${services.length}`);
await mongoose.disconnect();
