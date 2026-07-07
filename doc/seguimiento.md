# Seguimiento del Proyecto

## Estado general
- Documento base del producto: Completado
- Documentación técnica: En progreso
- Arquitectura inicial: En progreso
- Desarrollo de MVP: En progreso

## Lista de tareas por estado

### Completado
- [x] Definición inicial del PRD
- [x] Identificación de módulos principales
- [x] Definición de reglas de negocio
- [x] Estructura inicial de stack tecnológico
- [x] Creación de documentación base del proyecto
- [x] Repositorio git inicializado (rama `main`)
- [x] Diseño de base de datos (schema Prisma con 14 modelos)
- [x] Entorno local de Postgres (docker-compose) y primera migración aplicada
- [x] Scaffold del backend NestJS (main/app module, PrismaModule/PrismaService, endpoint /health verificado end-to-end contra Postgres real, lint y tests pasando)
- [x] Autenticación: registro, login, JWT + refresh token con rotación, logout, guard de rutas protegidas (/auth/me), rate limiting en login/registro, validación con Zod, auditoría de auth.register y auth.login. Verificado end-to-end con curl contra Postgres real (incluye rechazo de refresh reusado/revocado) y con tests unitarios de los casos de seguridad.
- [x] Scaffold del frontend Next.js 16 (App Router, Tailwind v4, shadcn/ui) con pantalla de login funcional: Server Actions + cookies httpOnly (sin exponer tokens al JS del navegador), React Hook Form + Zod, dashboard protegido de prueba (muestra perfil/hogar/rol desde /auth/me), logout, y `proxy.ts` (antes middleware) protegiendo /dashboard y redirigiendo /login si ya hay sesión. Verificado en navegador real con Playwright: login → dashboard → logout → redirect, y bloqueo de /dashboard sin sesión. Sin errores de consola.
- [x] Pantalla de registro en el frontend (/register): crea usuario + hogar (o se une a uno si se conoce el householdId), valida contraseñas coincidentes en el cliente y errores del backend (ej. correo duplicado) en el servidor, enlaza con /login y viceversa. Verificado en navegador real con Playwright: registro exitoso → dashboard con rol ADMIN, validación de contraseñas no coincidentes, y rechazo de correo duplicado sin redirigir.
- [x] Módulo de Ingresos en el backend (CRUD completo: crear, listar con filtros de período/tipo/miembro, ver uno, editar, eliminar como soft delete). Incluye `HouseholdAccessService` reutilizable (resuelve y valida a qué hogar pertenece cada request) que usarán los próximos módulos de negocio. Auditoría de income.create/update/delete. Verificado end-to-end con curl contra Postgres real: aislamiento entre hogares distintos (403 al intentar acceder a ingresos de otro hogar), soft delete (la fila permanece en la BD pero desaparece de listados/GET), y validación de Zod (monto negativo, período con formato inválido, tipo fuera del enum). Tests unitarios de los casos de seguridad (aislamiento, soft delete, memberId cruzado entre hogares).
- [x] Módulo de Conversión USD → DOP en el backend: conversiones parciales sobre un ingreso en USD (crear, listar/historial, ver una, saldo restante vía GET /conversions/balance/:incomeId), ledger inmutable (sin update/delete, coherente con "nunca eliminar historial"). Usa `Prisma.Decimal` para aritmética exacta (evita errores de punto flotante en montos y tasas). Verificado end-to-end con curl contra Postgres real: dos conversiones parciales sobre un ingreso de 500 USD calculan el saldo restante correctamente (500→300→50), rechazo de sobregiro con mensaje claro, rechazo de convertir un ingreso en DOP, y aislamiento entre hogares (403). Tests unitarios de los casos de negocio críticos.
- [x] Módulo de Pagos Recurrentes en el backend: crear/editar/eliminar (solo futuros), marcar pagado, generación automática de la ocurrencia del siguiente período al pagar, prioridad (Crítico/Importante/Opcional), frecuencia mensual o quincenal (dos ocurrencias por período). Requirió ajustar la restricción única de `RecurringPaymentOccurrence` de `[recurringPaymentId, period]` a `[recurringPaymentId, period, dueDate]` para soportar quincenal (migración `20260707142923`). Verificado end-to-end con curl contra Postgres real: generación automática al crear y al pagar, ajuste del día al último disponible del mes (día 31 en febrero → 28), eliminar cancela solo la ocurrencia PENDING futura y preserva intacta la ya PAID (historial inmutable), y aislamiento entre hogares. Tests unitarios de las funciones puras de fechas (`period.ts`) y de las reglas de negocio críticas del servicio.
- [x] Módulo de Gastos Variables en el backend: CRUD completo (crear, listar con filtros de mes/categoría/miembro, ver uno, editar, eliminar como soft delete) con las 7 categorías del PRD (Supermercado, Colmado, Comida, Transporte, Salidas, Otros, Imprevistos). Mismo patrón que Ingresos, reutilizando `HouseholdAccessService`. Verificado end-to-end con curl contra Postgres real: filtro por mes (YYYY-MM → rango de spentAt), filtro por categoría, validación de categoría inválida, soft delete, y aislamiento entre hogares (403 en gasto activo de otro hogar, 404 en uno ya eliminado). Tests unitarios de los casos de seguridad.
- [x] Calendario financiero en el frontend (/calendar): lista agrupada por fecha con "Pagos vencidos" y "Próximos pagos" (agrupados por mes), badges de prioridad y de vencido, botón "Marcar pagado" por ocurrencia (Server Action que llama al backend y usa `revalidatePath` para refrescar). Reutiliza el endpoint GET /recurring-payments/occurrences del backend, al que se le agregó el include del pago recurrente (nombre/categoría/prioridad/moneda) para poder mostrarlo. Enlazado desde /dashboard y protegido en proxy.ts. Verificado en navegador real con Playwright: agrupación correcta por mes, pago exitoso que genera automáticamente la siguiente ocurrencia y la mueve de "vencidos" a "próximos" (o de vuelta a "vencidos" si el nuevo vencimiento también ya pasó), sin errores de consola. Se encontró y corrigió un bug real: sin `revalidatePath('/calendar')` tras la Server Action, el router de Next.js mostraba datos obsoletos pese a que el backend sí se había actualizado correctamente.

### En progreso
- [ ] Arquitectura detallada del sistema (backend/frontend)
- [ ] Definición del flujo de trabajo de desarrollo (ramas develop/feature pendientes de crear)

### Pendiente
- [ ] Recuperación de contraseña (requiere decidir proveedor de email)
- [ ] Invitación formal de miembros a un hogar existente (hoy el registro solo permite unirse pasando un householdId ya conocido)
- [ ] Renovación silenciosa del access token (hoy si expira mientras se navega el dashboard, redirige a /login sin usar el refresh token automáticamente)
- [ ] Dashboard real con datos financieros (el actual es solo una prueba de la sesión autenticada)
- [ ] Módulo de metas de ahorro
- [ ] Módulo de reportes
- [ ] Integración de IA básica

## Resumen de avance
- Documentación de producto: 100%
- Planeación técnica: 65%
- Implementación: 70% (base de datos + backend NestJS + autenticación + Ingresos + Conversión USD→DOP + Pagos Recurrentes + Gastos Variables + frontend con login, registro y calendario financiero funcionales; falta dashboard real y metas de ahorro)

## Próximos pasos
1. Módulo de metas de ahorro (siguiente en el roadmap del PRD).
2. Dashboard real con datos financieros (disponible real, resumen de ingresos/gastos/pagos).
3. Renovación silenciosa de sesión.
