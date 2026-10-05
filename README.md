# MFC Admin — Backend

API REST de **MFC Admin**, el sistema interno para administrar un taller de bicicletas: clientes, bicicletas, presupuestos, inventario de repuestos, servicios, garantías con revisiones, notificaciones y caja.

> El frontend vive en un repositorio aparte (`MFC - Frontend`).
>
> Hoy el sistema atiende a un solo taller. El plan para convertirlo en una plataforma para varios talleres está en [`docs/multi-empresa.md`](docs/multi-empresa.md).

---

## Índice

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Reglas de negocio](#reglas-de-negocio)
- [API](#api)
- [Seguridad](#seguridad)
- [Tests](#tests)
- [Deploy](#deploy)
- [Problemas conocidos](#problemas-conocidos)

---

## Stack

| Área | Tecnología |
|---|---|
| Runtime | Node.js 22 (ES Modules) |
| Framework | Express 5 |
| Base de datos | MongoDB con Mongoose 8 |
| Autenticación | JWT (`jsonwebtoken`) + `bcryptjs` |
| Tareas programadas | `node-cron` |
| Email | Resend |
| PDF | `pdfmake` |
| Excel | `xlsx` (SheetJS, instalado desde su CDN oficial: la versión de npm está abandonada) |
| Seguridad y rendimiento | `helmet`, `cors`, `express-rate-limit`, `compression` |

## Requisitos

- Node.js **22.9 o superior** (se usan `--watch`, `--env-file` y `--env-file-if-exists`)
- Una base MongoDB (local o Atlas)
- Una API key de [Resend](https://resend.com) para los emails de invitación y recuperación de contraseña

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar los valores
npm run dev
```

La API queda en `http://localhost:4000/api`.

> **Cuidado:** si `MONGODB_URI` apunta a la base de producción, todo lo que hagas en local (crear presupuestos, mover trabajos, migraciones) modifica datos reales. Para probar, usá otra base (por ejemplo, la misma URI de Atlas con otro nombre de base).

### Primer usuario

No hay registro abierto. Un administrador invita a un email desde el dashboard y la persona se registra con el link que recibe (`/register?token=...`).

- El primer usuario registrado queda como `admin`; los siguientes, como `employee`.
- Hay un límite de 2 usuarios (`registerWithToken` en `auth.controller.js`).

## Variables de entorno

Ver [`.env.example`](.env.example).

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor. Por defecto `3000`. |
| `MONGODB_URI` | URI de conexión a MongoDB. Obligatoria. |
| `JWT_SECRET` | Secreto para firmar los tokens. Obligatoria; usar un valor largo y aleatorio. |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma (ej. `http://localhost:5173,https://mfc.vercel.app`). Obligatoria. |
| `RESEND_API_KEY` | API key de Resend. Obligatoria. |
| `EMAIL_FROM` | Remitente de los emails. |
| `FRONTEND_URL` | URL del frontend, para los links de invitación y de recuperación de contraseña. Obligatoria. |

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo: lee `.env` y reinicia al guardar (`node --watch`) |
| `npm start` | Producción: `node index.js`, lee `.env` si existe |
| `npm test` | Tests con el runner nativo de Node (`node --test`) |

### Migración de servicios a pesos

Los servicios pasaron de tener precio en USD a tenerlo en ARS. Para convertir el catálogo existente, correr **una sola vez** contra la base que corresponda:

```bash
node --env-file=.env scripts/migrate-services-to-ars.js          # usa el dólar blue actual
node --env-file=.env scripts/migrate-services-to-ars.js 1450     # cotización fija
```

- Solo toca servicios que todavía no tienen `price_ars`, así que correrlo dos veces no hace daño.
- Mientras un servicio no tenga precio en pesos, no se puede usar en presupuestos nuevos.

## Estructura del proyecto

```
index.js                  # Arranque: carga app y cron, escucha en PORT
scripts/                  # Scripts de mantenimiento (migraciones)
src/
├── app.js                # Middlewares globales y montaje de rutas
├── config/db.js          # Conexión a MongoDB
├── routes/               # Definición de endpoints por recurso
├── controllers/          # Lógica de cada endpoint
├── models/               # Schemas de Mongoose
├── middlewares/          # tokenVerify, isAdmin, upload (multer)
├── jobs/                 # Cron de garantías
├── services/             # Email y generación de PDFs
└── utils/
    ├── budgetCalculator.js   # Cálculo de ítems y totales del presupuesto (con tests)
    ├── getDollarRate.js      # Dólar blue de bluelytics, cacheado 15 minutos
    └── query.js              # Búsqueda segura (regex escapada) y paginado
```

## Modelo de datos

```
Cliente ──< Bicicleta ──< Presupuesto ──< Repuestos (snapshot de precio)
                              │
                              └──< Servicios (snapshot de precio)
                                       └── Garantía ──< Revisiones (checkups)
```

| Colección | Campos principales |
|---|---|
| `Client` | `name`, `surname`, `mobileNum` (único) |
| `Bike` | `brand`, `model`, `color`, `serialNumber`, `current_owner_id`, `ownership_history[]`, `active` |
| `Budget` | `bike_id`, `client_at_creation`, `employee_id`, `state`, `parts[]`, `services[]`, `dollar_rate_used`, `total_usd`, `total_ars`, `creation_date`, `payment_date` |
| `BikePart` | `code` (único), `brand`, `type`, `description`, `stock`, `pricing_currency` (`ARS`/`USD`), `cost_ars`, `markup_percent`, `sale_price_ars`, `price_usd` (legacy) |
| `Service` | `name`, `description`, `price_ars` (`price_usd` queda como referencia legacy) |
| `Notification` | `type` (`alert`/`reminder`), `message_body`, `budget_id`, `service_id`, `seen` |
| `CashFlow` / `Cash` | Movimientos (`ingreso`/`egreso`, `amount`, `description`, `employee_id`) y saldo actual |
| `Employee` | `name`, `email`, `password` (hash), `role` (`admin`/`employee`), token de reseteo |
| `Invitation` | `email`, `token`, `expiresAt`, `used` |

Cada servicio dentro de un presupuesto puede tener una garantía:

```js
warranty: {
  hasWarranty: Boolean,
  startDate: Date,
  endDate: Date,
  status: 'activa' | 'expirada' | 'anulada',
  checkups: [{ date: Date, notified: Boolean, completed: Boolean }]
}
```

## Reglas de negocio

### Estados del presupuesto

```
iniciado → en proceso → terminado → pagado → retirado
```

- Se pueden saltar estados, pero **nunca volver atrás**.
- No se pueden editar ítems de un presupuesto `pagado` o `retirado`.

### Precios y snapshot

- Al crear un presupuesto se guarda una copia del nombre, la descripción y el precio de cada repuesto y servicio. Los cambios de precio posteriores no afectan presupuestos existentes.
- Al editar un presupuesto, los ítems que ya estaban conservan su precio, su garantía y su cobertura; solo los ítems nuevos toman el precio actual.
- Servicios en ARS. Repuestos en ARS (`sale_price_ars = cost_ars × (1 + markup_percent/100)`) o en USD (legacy).
- `total_ars` = ítems en ARS + ítems en USD × `dollar_rate_used`, redondeado. La cotización es la del dólar blue al momento de crear el presupuesto, y es la que se usa al cobrar.
- Todos los totales se calculan en el servidor ([`budgetCalculator.js`](src/utils/budgetCalculator.js)). El cliente solo envía IDs y cantidades.

### Stock

- El stock se descuenta **al salir de `iniciado`** (a cualquier estado siguiente). Mientras el presupuesto está `iniciado`, editarlo no toca el stock.
- Editar un presupuesto que ya descontó stock ajusta solo la diferencia.
- Cada descuento es atómico (`findOneAndUpdate` con `stock >= cantidad` y `$inc`). Si alguna pieza no alcanza, se revierte lo ya descontado y se responde `400`.
- Borrar un presupuesto `en proceso` o `terminado` devuelve el stock. Si estaba `pagado` o `retirado`, no, porque las piezas ya se entregaron con la bici.

### Caja

- Pasar a `pagado` registra un ingreso por `total_ars`.
- Pasar directo a `retirado` sin haber pasado por `pagado` también registra el ingreso (caso "paga y retira en el momento"). Si ya estaba pagado, no se duplica.
- Un presupuesto en $0 (todo cubierto por garantía) no genera movimiento.
- Las compras y reposiciones de repuestos en ARS registran un egreso.

### Garantías

- Pertenecen a un **servicio** dentro de un presupuesto, no al presupuesto completo.
- Se crean al pasar a `terminado`, `pagado` o `retirado`, para los servicios que elija el empleado (`giveWarranty` + `warrantyServices`). Si el servicio ya tenía garantía, no se pisa.
- Duración: **6 meses**, con una revisión a los **3 meses** (constantes `WARRANTY_MONTHS` y `CHECKUP_MONTHS` en `budget.controller.js`).
- **La garantía sigue a la bicicleta**, no al dueño: si la bici cambia de dueño, la garantía continúa.
- Al crear un presupuesto, el backend busca garantías vigentes (`activa`, `startDate <= hoy <= endDate`) de la misma bici. **No se aplican solas:** el frontend debe pedirlas explícitamente en `applyWarranty`. Si se aplica, el servicio queda en $0 y `covered_by_warranty` apunta al presupuesto que originó la garantía.
- Una garantía vigente puede usarse varias veces.
- Se puede anular manualmente (por ejemplo, si el cliente llevó la bici a otro taller): queda en `anulada`.

### Cron de garantías

[`src/jobs/warranties.job.js`](src/jobs/warranties.job.js) corre todos los días a las 00:00, hora de Argentina:

1. Si `endDate` ya pasó, la garantía pasa a `expirada`.
2. Una semana antes de cada revisión crea una notificación y marca `notified = true` para no repetirla.
3. Si pasó la fecha de una revisión y no se completó (`completed = false`), la garantía pasa a `expirada`.

## API

Base: `/api`. Todas las rutas, salvo las de autenticación públicas, requieren `Authorization: Bearer <token>`.

### Autenticación — `/auth`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Devuelve `{ token, employee }`. Tiene rate limit de 5 intentos cada 15 minutos. |
| GET | `/profile` | Datos del usuario logueado (requiere token). |
| POST | `/register` | Registro con token de invitación. |
| POST | `/forgot-password` | Envía el email de recuperación. |
| POST | `/reset-password` | Cambia la contraseña con el token de reseteo. |

### Presupuestos — `/budgets`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/` | Crear. Body: `{ bike_id, services: [{ service_id }], bikeparts: [{ bikepart_id, amount }], applyWarranty: [serviceId] }`. El empleado sale del token. |
| GET | `/?states=iniciado,en proceso` | Listar, opcionalmente filtrado por estados. |
| GET | `/:id` | Detalle. |
| PUT | `/:id` | Cambiar estado. Body: `{ state, giveWarranty?, warrantyServices? }`. |
| PUT | `/:id/edit` | Reemplazar servicios y repuestos. |
| PATCH | `/:id/checkup` | Marcar revisión hecha. Body: `{ serviceId, checkupDate }`. |
| PATCH | `/:id/warranty/void` | Anular garantía. Body: `{ serviceId }`. |
| DELETE | `/:id` | Borrar (devuelve stock según el estado). |
| GET | `/client/:clientId` | Presupuestos de las bicis actuales y anteriores de un cliente. |
| GET | `/active-warranties?bike_id=&client_id=` | Presupuestos con garantías vigentes; cada uno trae solo los servicios vigentes. |
| POST | `/generate-pdf` | Genera el PDF del presupuesto a partir del body. |

### Catálogo e inventario

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/services?q=&page=&limit=` | Servicios. Con `page` devuelve `{ items, total, page, pages }`; sin `page`, la lista completa. |
| POST / PUT / DELETE | `/services`, `/services/:id` | ABM de servicios (`{ name, description, price_ars }`). |
| GET | `/bikeparts?search=&type=&inStock=1&page=&limit=` | Repuestos con `price` y `currency` resueltos. Mismo esquema de paginado. |
| GET | `/bikeparts/:id` | Detalle. |
| POST / PUT / PATCH / DELETE | `/bikeparts`, `/bikeparts/:id` | ABM de repuestos. |
| PATCH | `/bikeparts/:id/stock` | Reponer stock (registra egreso si el repuesto es en ARS). |
| POST | `/bikeparts/prices/import-excel` | Actualiza costos desde un Excel: columna A código, columna E precio de lista. |

### Clientes y bicicletas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/clients?q=&limit=&withBikes=1` | Clientes. `withBikes=1` incluye las bicis en la misma consulta. |
| GET / POST / PUT / DELETE | `/clients`, `/clients/:id` | ABM de clientes. |
| GET | `/bikes?client_id=` | Bicicletas, opcionalmente de un cliente. |
| POST | `/bikes` | Alta (`serialNumber` opcional). |
| PUT | `/bikes/:id` | Editar marca, modelo, color y número de serie (vacío = sin número). |
| DELETE | `/bikes/:id` | Desactivar (no borra). |
| PUT | `/bikes/transfer/:bikeId` | Transferir a otro cliente (`{ new_client_id }`). |
| GET | `/bikes/:bikeId/history` | Historial de presupuestos de la bici. |

### Otros

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/bootstrap/dashboard` | Resumen del dashboard (conteos y listas cortas). |
| GET | `/notifications` | Notificaciones. |
| PUT | `/notifications/:id/seen` | Marcar como vista. |
| DELETE | `/notifications/:id` | Borrar. |
| GET | `/utils/dollar-blue` | Cotización del dólar blue. |
| POST | `/tickets/generate`, `/tickets/form` | PDFs de ticket y formulario de ingreso. |
| POST | `/invitations/invite` | Invitar un usuario por email. **Solo admin.** |
| GET / POST | `/cash/balance`, `/cash/flow?start=&end=&page=&limit=`, `/cash/flow/summary` | Saldo, movimientos paginados con totales del rango (fechas en hora argentina) y resumen. **Solo admin.** |

Los errores devuelven un JSON con `message` o `error` y un código HTTP acorde (`400` validación, `401` sin sesión, `403` sin permiso, `404` no encontrado, `500` error interno).

## Seguridad

- `tokenVerify` se aplica en `app.js` a todas las rutas salvo login, registro y recuperación de contraseña.
- `isAdmin` usa el rol leído **desde la base** (no desde el token), así un cambio de rol aplica en el momento.
- Los tokens de invitación y de reseteo se convierten a `String` antes de consultar, para evitar inyección de operadores de MongoDB.
- Las búsquedas escapan el texto antes de armar la regex ([`utils/query.js`](src/utils/query.js)).
- El empleado que crea un presupuesto o un movimiento de caja sale del token, no del body.
- `helmet` para headers de seguridad y CORS restringido a `CORS_ORIGIN`.
- Rate limit: login (5 intentos cada 15 minutos) y registro/recuperación de contraseña (10 por hora).
- Contraseñas de al menos 8 caracteres. El hash y el token de reseteo tienen `select: false`: nunca salen en una respuesta.
- `tokenVerify` consulta la base en cada pedido: un usuario borrado o un token emitido antes del último cambio de contraseña reciben `401`.
- Los cambios de estado de un presupuesto son atómicos: un doble clic recibe `409` en lugar de descontar stock o cobrar dos veces.
- Body JSON limitado a 200 KB; la subida de Excel solo acepta `.xlsx`/`.xls` de hasta 2 MB.
- Al arrancar se validan las variables de entorno obligatorias, y ante un `SIGTERM` (redeploy) el servidor termina los pedidos en curso antes de cerrar.

## Tests

```bash
npm test
```

Cubren [`budgetCalculator.js`](src/utils/budgetCalculator.js): totales en ARS y USD, aplicación de garantías, conservación de precios al editar y validación de cantidades. Para sumar tests, crear archivos `*.test.js` dentro de `src/`.

## Deploy

El backend está en **Railway**:

- Comando de inicio: `npm start`.
- Configurar todas las variables de entorno en Railway (no se sube `.env`).
- Incluir el dominio del frontend en `CORS_ORIGIN`.
- El cron corre dentro del mismo proceso. Si algún día se escala a más de una instancia, se ejecutaría una vez por instancia.
- Después de deployar un cambio de modelo, revisar si hace falta correr algún script de `scripts/`.

## Problemas conocidos

- `deleteClient` borra las bicicletas del cliente en cascada y deja sus presupuestos huérfanos.
- Al transferir una bici, el campo `from` del historial usa la fecha de creación de la bici en vez de la fecha de la transferencia anterior.
- Los PDFs se generan con los datos que envía el frontend.
