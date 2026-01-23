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
            if (!part) throw new Error("BikePart not found");
        
            if (part.pricing_currency === "ARS") {
                if (part.sale_price_ars == null) {
                    throw new Error(`Repuesto ${part.description} sin precio de venta`);
                }
                unit_price = part.sale_price_ars;
                currency = "ARS";
            } else {
                unit_price = part.price_usd;
                currency = "USD";
            }
        
            description = part.description;
        }
        
        const amount = Number(item.amount || 0);
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
    const services = servicesInput.map((item) => {
        const service = servicesDocs.find(
            (s) => String(s._id) === String(item.service_id)
        );
        if (!service) throw new Error("Service not found");

        let price = service.price_usd;
        let covered_by_warranty = null;
        
        const match = activeWarranties.find(
            (w) => w.serviceId === String(service._id)
        );
        const userWantsWarranty = applyWarranty.includes(String(service._id));
        if (match && userWantsWarranty) {
            price = 0;
            covered_by_warranty = match.budgetId;
        }
        total_usd += price;
        return {
            service_id: service._id,
            name: service.name,
            description: service.description,
            price_usd: price,
            warranty: item.warranty || null,
            covered_by_warranty
        };
    });
    // MONEDA FINAL
    let currency = "ARS";
    if (total_usd > 0 && total_ars === 0) {
        currency = "USD";
        total_ars = total_usd * dollarRate;
    }
    return {
        parts,
        services,
        total_usd,
        total_ars,
        currency
    };
}