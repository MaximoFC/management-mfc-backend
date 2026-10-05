# Plan de migración a multi-empresa

**Objetivo:** que una sola instalación de MFC Admin (un backend, un frontend, una base) sirva a varios talleres, cada uno viendo solo sus datos.

**Restricción principal:** la base de producción tiene datos reales del taller actual. Ningún paso puede perderlos ni dejar el sistema caído para ese taller.

> Estado: **planificado, no implementado.** Este documento describe la ruta; cada fase se ejecuta y se valida por separado.

---

## 1. Decisión de arquitectura

### Opciones evaluadas

| Modelo | Cómo funciona | A favor | En contra |
|---|---|---|---|
| **Base compartida con `workshop_id`** (elegido) | Todas las colecciones tienen un campo que indica a qué taller pertenece el documento | Una sola base, un solo deploy, migraciones una vez, costo mínimo en Railway/Atlas, reportes globales posibles | Un bug que olvide filtrar por taller expone datos de otro taller: hay que blindar el código |
| Una base por taller | Mismo código, la conexión se elige según el taller | Aislamiento fuerte, borrar un taller es borrar su base | Una conexión por taller, migraciones repetidas N veces, más costo y operación |
| Un deploy por taller | Copia completa del sistema para cada cliente | Cero cambios de código | No es una plataforma: N deploys, N actualizaciones, N bases |

### Por qué base compartida

- La cantidad de datos por taller es chica (cientos o miles de presupuestos), muy lejos de cualquier límite de MongoDB.
- Un solo proceso en Railway y una sola base mantienen el costo y la operación bajos.
- El riesgo de fuga de datos entre talleres se controla con un solo punto de filtrado obligatorio (ver sección 4) y tests específicos.

Si en el futuro un cliente exige aislamiento físico, se le puede dar una base propia sin cambiar el modelo: el `workshop_id` sigue existiendo igual.

### Decisiones de alcance

- **Un usuario pertenece a un solo taller.** El email de `Employee` sigue siendo único en toda la plataforma. Que una misma persona trabaje en varios talleres con una cuenta queda fuera de alcance hasta que haga falta.
- **El dólar blue es global**: se comparte entre todos los talleres.
- **El taller actual se convierte en el primer taller** de la plataforma, con todos sus datos intactos.

---

## 2. Qué cambia en el modelo de datos

### Nueva colección `Workshop`

```js
{
  name: String,            // "Mecánica Facundo Callejas"
  address: String,
  mobileNum: String,
  logoUrl: String,
  settings: {
    warrantyMonths: Number,      // hoy fijo en 6
    checkupMonths: Number,       // hoy fijo en 3
    defaultMarkupPercent: Number,// hoy 45
    maxUsers: Number             // hoy 2, global
  },
  active: Boolean,
  createdAt, updatedAt
}
```

Con esto salen del código los datos escritos a mano: nombre, dirección y teléfono que hoy van fijos en los PDFs, y las constantes de garantía.

### `workshop_id` en todas las colecciones

| Colección | Cambio |
|---|---|
| `Client`, `Bike`, `Budget`, `BikePart`, `Service`, `Notification`, `CashFlow`, `Invitation`, `Employee` | Agregar `workshop_id` (ObjectId, ref `Workshop`, indexado) |
| `Cash` | Hoy es un documento único global (`Cash.findOne()`). Pasa a ser **uno por taller**: `workshop_id` único |

### Índices únicos que hoy son globales

Hoy estos campos son únicos en toda la base. En multi-empresa dos talleres pueden tener, por ejemplo, el mismo cliente o el mismo código de repuesto:

| Colección | Índice actual | Índice nuevo |
|---|---|---|
| `Client` | `mobileNum` único | `{ workshop_id, mobileNum }` único |
| `BikePart` | `code` único | `{ workshop_id, code }` único |
| `Bike` | `serialNumber` único (sparse) | `{ workshop_id, serialNumber }` único (parcial) |
| `Employee` | `email` único | Se mantiene global (ver decisiones de alcance) |
| `Cash` | (ninguno) | `workshop_id` único |

Los índices de rendimiento existentes pasan a empezar por `workshop_id`, por ejemplo `{ workshop_id, state, creation_date }` en `Budget`.

---

## 3. Ruta de migración por fases

La estrategia es **expandir → completar → contraer**: primero se agregan campos opcionales sin cambiar el comportamiento, después se completan los datos existentes, y recién al final se vuelven obligatorios y se activa el aislamiento. Cada fase se deploya y se valida antes de pasar a la siguiente, y cada una tiene su vuelta atrás.

### Fase 0 — Preparación (sin tocar producción)

1. **Backup completo de producción:**
   - Snapshot en Atlas (o `mongodump --uri="$MONGODB_URI" --out=backup-AAAA-MM-DD`).
   - Verificar que el backup se pueda restaurar en una base aparte (`mongorestore`). Un backup que nunca se restauró no cuenta como backup.
2. **Entorno de staging:**
   - Una base `mfc-staging` restaurada desde el backup y un servicio de backend aparte en Railway que apunte a ella.
   - Todas las fases se ensayan primero ahí, con datos reales.
3. **Tests de base** para lo que no puede romperse: cálculo de presupuestos (ya existe), transiciones de estado con stock y caja, y garantías.
4. **Inventario de consultas:** listar cada `find`, `findOne`, `findById`, `countDocuments`, `aggregate`, `updateOne` y `findOneAndUpdate` del backend. Cada uno va a necesitar el filtro por taller. Hoy hay unos 25 `findById` y un `aggregate`.

**Vuelta atrás:** no aplica, no se tocó producción.

### Fase 1 — Agregar campos sin cambiar comportamiento (expandir)

1. Crear el modelo `Workshop`.
2. Agregar `workshop_id` **opcional** a todos los schemas.
3. Al crear documentos nuevos, completar `workshop_id` con el taller del usuario si lo tiene.
4. Deployar. El sistema funciona exactamente igual que antes: nadie filtra todavía por taller.

**Validación:** el taller actual sigue usando el sistema normalmente.
**Vuelta atrás:** volver al deploy anterior. Los campos extra no molestan.

### Fase 2 — Completar los datos existentes (backfill)

Script `scripts/backfill-workshop.js`, **idempotente** (correrlo dos veces no cambia nada):

1. Crear el `Workshop` del taller actual con su nombre, dirección y teléfono (hoy escritos a mano en el frontend), y la configuración actual: 6 meses de garantía, revisión a los 3, markup 45%, 2 usuarios. Si ya existe, reutilizarlo.
2. Para cada colección, ejecutar `updateMany({ workshop_id: { $exists: false } }, { $set: { workshop_id } })`.
3. Asignar el documento `Cash` existente al taller.
4. **Verificar** e imprimir un reporte:
   - Cantidad de documentos por colección antes y después: tiene que coincidir.
   - Cantidad de documentos sin `workshop_id`: tiene que ser 0.
   - Saldo de caja antes y después: tiene que ser idéntico.

Orden de ejecución:
1. Ensayar en staging y comparar el reporte.
2. Tomar un backup nuevo de producción inmediatamente antes de correrlo.
3. Correrlo en producción.

**Vuelta atrás:** `updateMany({}, { $unset: { workshop_id: "" } })` en cada colección y borrar el `Workshop`. O restaurar el backup.

### Fase 3 — Índices compuestos (contraer, parte 1)

Orden obligatorio, para que nunca haya un momento sin restricción de unicidad:

1. Crear los índices compuestos nuevos (`{ workshop_id, mobileNum }`, etc.). Si falla, hay duplicados que resolver antes de seguir.
2. Verificar que estén construidos (`db.collection.getIndexes()`).
3. Recién entonces borrar los índices únicos globales viejos.
4. Marcar `workshop_id` como `required` en los schemas.

Hacerlo con un script explícito (`scripts/migrate-indexes.js`), no confiar en `autoIndex` de Mongoose: en producción conviene controlar cuándo se construye y se borra cada índice.

**Vuelta atrás:** recrear los índices globales y borrar los compuestos. Con un solo taller no puede haber conflicto.

### Fase 4 — Aislamiento en el código (el paso crítico)

Este es el cambio que realmente separa a los talleres. Se implementa completo en staging, con tests de aislamiento, antes de llegar a producción.

#### 4.1 El taller sale siempre del servidor

- `tokenVerify` carga el `Employee` desde la base y deja `req.workshopId = employee.workshop_id`. Es la misma idea que ya se aplicó con `isAdmin`: no confiar en lo que viene en el token ni en el body.
- **Nunca** se acepta `workshop_id` desde el body o la query.
- Si el taller está inactivo (`active: false`), responder `403`.

#### 4.2 Un único punto de filtrado

Hay dos enfoques posibles para no depender de acordarse de filtrar en cada consulta:

| Enfoque | Cómo | Riesgo |
|---|---|---|
| **Plugin de Mongoose** (recomendado) | Un plugin global agrega `workshop_id` a todo `find`, `findOne`, `count`, `update` y `delete` usando el contexto del request (`AsyncLocalStorage`). Si una consulta se ejecuta sin taller en el contexto, **lanza un error** en vez de devolver todo. | `aggregate` no pasa por los hooks de consulta: hay que agregar el `$match` a mano (hoy hay uno solo, en clientes). |
| Helpers explícitos | Reemplazar `Model.find(q)` por `scoped(Model, req).find(q)` en todos lados | Fácil de olvidar en código nuevo |

Se elige el plugin porque falla de forma segura: una consulta sin taller da error, en lugar de mostrar los datos de todos. Las únicas excepciones (login, registro, cron, superadmin) declaran explícitamente que operan sin taller.

#### 4.3 Referencias cruzadas

Además de filtrar lo que se lee, hay que validar lo que se recibe:

- Al crear un presupuesto, `bike_id`, cada `service_id` y cada `bikepart_id` tienen que pertenecer al taller del usuario. Si no, se responde `404`, como si no existieran.
- Lo mismo al transferir bicis (`new_client_id`), al crear bicis (`current_owner_id`) y al editar presupuestos.
- Con el plugin, buscar un ID de otro taller ya devuelve `null`, así que la validación sale casi gratis. Igual hay que cubrirla con tests.

#### 4.4 Partes del código con lógica global

| Lugar | Hoy | Cambio |
|---|---|---|
| `cash.controller.js` | `Cash.findOne()` agarra el único documento | `Cash.findOne({ workshop_id })`, y crearlo con `$inc` + `upsert` (de paso se arregla el problema de concurrencia del saldo) |
| `auth.controller.js` / `invitation.controller.js` | `Employee.countDocuments()` global para el límite de 2 usuarios y para decidir quién es admin | Contar por taller y usar `settings.maxUsers` |
| `registerWithToken` | El primer usuario de la base es admin | El rol viene en la invitación |
| `budget.controller.js` | `WARRANTY_MONTHS` / `CHECKUP_MONTHS` fijos | Leer de `workshop.settings` |
| `bikepart.controller.js` | Markup 45% por defecto fijo | `settings.defaultMarkupPercent` |
| `bootstrap.controller.js` | Conteos globales | Filtrados por taller (lo resuelve el plugin) |
| `client.controller.js` | `aggregate` con `$lookup` | Agregar `{ $match: { workshop_id } }` como primera etapa |
| `jobs/warranties.job.js` | Recorre todos los presupuestos | Puede seguir recorriendo todo (es un proceso del sistema), pero cada notificación se crea con el `workshop_id` de su presupuesto |
| PDFs | Datos del taller enviados desde el frontend | El backend los toma de `Workshop` |

#### 4.5 Tests de aislamiento (obligatorios antes de producción)

Con dos talleres de prueba, A y B, cada uno con datos:

- Un usuario de A no ve en ningún listado datos de B: clientes, presupuestos, repuestos, servicios, garantías, notificaciones, caja, dashboard.
- Un usuario de A recibe `404` al pedir, editar o borrar por ID cualquier documento de B.
- Un usuario de A no puede crear un presupuesto con una bici, servicio o repuesto de B.
- Cobrar en A no modifica la caja de B.
- El cron genera las notificaciones en el taller correcto.

**Vuelta atrás:** volver al deploy anterior. Los datos no cambian en esta fase, solo cambia el código que los lee.

### Fase 5 — Alta de talleres (onboarding)

1. Nuevo rol **`superadmin`** (el dueño de la plataforma), sin taller asignado. Puede:
   - Crear un taller y enviar la invitación a su primer administrador.
   - Activar o desactivar talleres.
   - Ver métricas globales (cantidad de talleres, uso).
2. La invitación lleva `workshop_id` y `role`. El primer usuario de cada taller es su `admin`, y ese admin invita a sus empleados.
3. Pantalla **Configuración del taller** para el admin: nombre, dirección, teléfono, logo, duración de garantía y revisión, markup por defecto.
4. Arreglar de paso el link de recuperación de contraseña, que hoy está fijo en `localhost`.

### Fase 6 — Frontend

Cambios menores, porque el aislamiento lo resuelve el backend:

- Mostrar el nombre y el logo del taller en el sidebar (vienen en `/auth/profile`).
- Sacar del código los datos del taller y los textos fijos del PDF y del formulario.
- Pantalla de configuración del taller (solo admin).
- Panel de superadmin (puede ser una sección aparte con su propia ruta protegida).
- Al cerrar sesión ya se limpian los stores, así que no quedan datos de un taller al entrar con otro usuario.

---

## 4. Orden de deploy en producción

| Paso | Qué | Antes | Riesgo para el taller actual |
|---|---|---|---|
| 1 | Fase 1: campos opcionales | Backup | Nulo |
| 2 | Fase 2: backfill | Backup nuevo + ensayo en staging | Bajo (solo agrega un campo) |
| 3 | Fase 3: índices | Backup | Bajo |
| 4 | Fase 4: aislamiento | Tests de aislamiento en verde en staging | Medio: es el cambio de código grande |
| 5 | Fase 5 y 6: onboarding y frontend | — | Nulo para el taller actual |
| 6 | Alta del segundo taller | Probar con un taller "demo" propio antes que con un cliente real | — |

Recomendaciones para cada deploy:
- Hacerlo fuera del horario del taller.
- Avisarle al taller actual.
- Tener anotado el comando exacto de vuelta atrás.

---

## 5. Riesgos y cómo se mitigan

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos durante la migración | Backup verificado antes de cada fase de datos, scripts idempotentes, reporte de conteos antes y después, ensayo previo en staging |
| Un taller ve datos de otro | Plugin que falla si una consulta no tiene taller, `workshopId` siempre desde el servidor, validación de referencias cruzadas, tests de aislamiento |
| Choque de índices únicos | Crear los compuestos antes de borrar los globales, y verificar duplicados antes |
| Caja mezclada entre talleres | `Cash` por taller con índice único, actualizado con `$inc` |
| Notificaciones o cron cruzados | Cada notificación se crea con el `workshop_id` de su presupuesto; test específico |
| Carga en Railway al crecer | Los índices empiezan por `workshop_id`, los listados están paginados y el dashboard ya usa un endpoint de resumen. Escalar a más instancias requiere sacar el cron a un proceso único (ver README) |

---

## 6. Pendientes previos recomendados

Conviene resolver estos puntos del README antes de la Fase 4, porque se mezclan con el aislamiento:

- `deleteClient` que borra bicis en cascada y deja presupuestos huérfanos.
- Link de recuperación de contraseña fijo en `localhost`.
- PDFs generados con datos del frontend.

---

## 7. Fuera de alcance (por ahora)

- Facturación y planes pagos por taller.
- Un usuario en varios talleres.
- Subdominios por taller (`taller1.mfcadmin.com`). El taller se resuelve por el usuario logueado, que alcanza para empezar.
- Base de datos separada por taller.

Cada uno se puede agregar después sin rehacer el modelo, porque todo se apoya en `workshop_id`.
