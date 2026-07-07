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

### En progreso
- [ ] Arquitectura detallada del sistema (backend/frontend)
- [ ] Definición del flujo de trabajo de desarrollo (ramas develop/feature pendientes de crear)

### Pendiente
- [ ] Recuperación de contraseña (requiere decidir proveedor de email)
- [ ] Invitación formal de miembros a un hogar existente (hoy el registro solo permite unirse pasando un householdId ya conocido)
- [ ] Renovación silenciosa del access token (hoy si expira mientras se navega el dashboard, redirige a /login sin usar el refresh token automáticamente)
- [ ] Dashboard real con datos financieros (el actual es solo una prueba de la sesión autenticada)
- [ ] Módulo de ingresos
- [ ] Módulo de pagos recurrentes
- [ ] Módulo de reportes
- [ ] Integración de IA básica

## Resumen de avance
- Documentación de producto: 100%
- Planeación técnica: 65%
- Implementación: 45% (base de datos + backend NestJS + autenticación completa + frontend con login y registro funcionales; falta dashboard real y módulos de negocio)

## Próximos pasos
1. Renovación silenciosa de sesión (usar el refresh token antes de forzar logout).
2. Implementar primer dashboard con datos financieros reales.
3. Invitación formal de miembros a un hogar existente.
