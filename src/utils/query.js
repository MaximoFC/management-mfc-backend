// Helpers para búsquedas y paginado desde query params

export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchRegex = (text) => new RegExp(escapeRegex(String(text).trim()), "i");

// Devuelve null si el request no pidió paginado (compatibilidad con el listado completo)
export const getPagination = (query, maxLimit = 50) => {
  if (query.page === undefined) return null;
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

// Ejecuta find + count y arma { items, total, page, pages }
export const paginate = async (Model, filter, { page, limit, skip }, sort) => {
  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
};
