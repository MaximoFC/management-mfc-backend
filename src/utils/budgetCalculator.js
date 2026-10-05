// Errores de datos del presupuesto: el controlador los responde como 400
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

export function calculateBudget({
    bikepartsInput = [],
    servicesInput = [],
    partsDocs = [],
    servicesDocs = [],
    existingBudget = null,
    activeWarranties = [],
    applyWarranty = [],
    dollarRate
}) {
    let total_usd = 0;
    let total_ars = 0;

    // REPUESTOS
    const parts = bikepartsInput.map((item) => {
        const existing = existingBudget?.parts?.find(
            (p) =>
            String(p.bikepart_id?._id || p.bikepart_id) ===
            String(item.bikepart_id)
        );

        let unit_price;
        let currency;
        let description;

        if (existing) {
            // SNAPSHOT
            unit_price = existing.unit_price;
            currency = existing.currency;
            description = existing.description;
        } else {
            // ITEM NUEVO
            const part = partsDocs.find(
                (p) => String(p._id) === String(item.bikepart_id)
            );
            if (!part) throw badRequest("BikePart not found");
        
            if (part.pricing_currency === "ARS") {
                if (part.sale_price_ars == null) {
                    throw badRequest(`Repuesto ${part.description} sin precio de venta`);
                }
                unit_price = part.sale_price_ars;
                currency = "ARS";
            } else {
                if (part.price_usd == null) {
                    throw badRequest(`Repuesto ${part.description} sin precio`);
                }
                unit_price = part.price_usd;
                currency = "USD";
            }
        
            description = part.description;
        }
        
        const amount = Number(item.amount);
        if (!Number.isInteger(amount) || amount < 1) {
            throw badRequest(`Cantidad inválida para ${description}`);
        }
        const subtotal = unit_price * amount;
    
        if (currency === "ARS") total_ars += subtotal;
        else total_usd += subtotal;
        
        return {
            bikepart_id: item.bikepart_id,
            description,
            unit_price,
            currency,
            amount,
            subtotal
        };
    });

    // SERVICIOS
    const serviceIds = servicesInput.map((s) => String(s.service_id));
    if (new Set(serviceIds).size !== serviceIds.length) {
        throw badRequest("Hay servicios repetidos en el presupuesto");
    }

    const services = servicesInput.map((item) => {
        const existing = existingBudget?.services?.find(
            (s) => String(s.service_id?._id || s.service_id) === String(item.service_id)
        );

        // SNAPSHOT: un servicio que ya estaba en el presupuesto conserva precio, garantía y cobertura
        if (existing) {
            if (existing.price_ars != null) total_ars += existing.price_ars;
            else total_usd += existing.price_usd || 0;
            return {
                service_id: existing.service_id?._id || existing.service_id,
                name: existing.name,
                description: existing.description,
                price_ars: existing.price_ars,
                price_usd: existing.price_usd,
                warranty: existing.warranty || null,
                covered_by_warranty: existing.covered_by_warranty || null
            };
        }

        const service = servicesDocs.find(
            (s) => s && String(s._id) === String(item.service_id)
        );
        if (!service) throw badRequest("Service not found");
        if (service.price_ars == null) {
            throw badRequest(`El servicio ${service.name} no tiene precio en pesos`);
        }

        let price = service.price_ars;
        let covered_by_warranty = null;

        const match = activeWarranties.find(
            (w) => w.serviceId === String(service._id)
        );
        if (match && applyWarranty.includes(String(service._id))) {
            price = 0;
            covered_by_warranty = match.budgetId;
        }
        total_ars += price;
        return {
            service_id: service._id,
            name: service.name,
            description: service.description,
            price_ars: price,
            warranty: null,
            covered_by_warranty
        };
    });

    // TOTAL FINAL EN ARS
    total_ars = Math.round(total_ars + total_usd * dollarRate);

    // Moneda base solo informativa
    let currency = total_usd > 0 ? "USD" : "ARS";

    return {
        parts,
        services,
        total_usd,
        total_ars,
        currency
    };
}