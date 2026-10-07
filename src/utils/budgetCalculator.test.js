import test from "node:test";
import assert from "node:assert/strict";
import { calculateBudget } from "./budgetCalculator.js";

const service = { _id: "s1", name: "Service amortiguador", description: "", price_ars: 50000 };
const partArs = { _id: "p1", description: "Cámara", pricing_currency: "ARS", sale_price_ars: 8000 };
const partUsd = { _id: "p2", description: "Cadena", pricing_currency: "USD", price_usd: 10 };

test("suma servicios en ARS, repuestos ARS y USD convertidos", () => {
  const r = calculateBudget({
    servicesInput: [{ service_id: "s1" }],
    bikepartsInput: [{ bikepart_id: "p1", amount: 2 }, { bikepart_id: "p2", amount: 1 }],
    servicesDocs: [service],
    partsDocs: [partArs, partUsd],
    dollarRate: 1000
  });
  assert.equal(r.total_ars, 50000 + 16000 + 10000);
  assert.equal(r.services[0].price_ars, 50000);
});

test("garantía solo se aplica si existe y el usuario la pide", () => {
  const base = { servicesInput: [{ service_id: "s1" }], servicesDocs: [service], dollarRate: 1000,
    activeWarranties: [{ serviceId: "s1", budgetId: "b0" }] };
  assert.equal(calculateBudget(base).total_ars, 50000);
  const covered = calculateBudget({ ...base, applyWarranty: ["s1"] });
  assert.equal(covered.total_ars, 0);
  assert.equal(covered.services[0].covered_by_warranty, "b0");
  assert.equal(calculateBudget({ ...base, activeWarranties: [], applyWarranty: ["s1"] }).total_ars, 50000);
});

test("al editar, un servicio existente conserva precio, garantía y cobertura", () => {
  const warranty = { hasWarranty: true, status: "activa" };
  const existingBudget = { parts: [], services: [
    { service_id: "s1", name: "Viejo", price_usd: 20, warranty, covered_by_warranty: null }
  ] };
  const r = calculateBudget({ servicesInput: [{ service_id: "s1" }], servicesDocs: [service],
    existingBudget, dollarRate: 1000 });
  assert.equal(r.total_ars, 20000);
  assert.equal(r.services[0].warranty, warranty);
});

test("rechaza cantidades inválidas", () => {
  assert.throws(() => calculateBudget({ bikepartsInput: [{ bikepart_id: "p1", amount: -1 }],
    partsDocs: [partArs], dollarRate: 1000 }));
});

test("rechaza servicios repetidos y repuestos USD sin precio", () => {
  assert.throws(() => calculateBudget({ servicesInput: [{ service_id: "s1" }, { service_id: "s1" }],
    servicesDocs: [service], dollarRate: 1000 }), /repetidos/);
  assert.throws(() => calculateBudget({ bikepartsInput: [{ bikepart_id: "p3", amount: 1 }],
    partsDocs: [{ _id: "p3", description: "Viejo", pricing_currency: "USD" }], dollarRate: 1000 }), /sin precio/);
});
