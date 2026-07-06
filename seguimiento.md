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

### En progreso
- [ ] Arquitectura detallada del sistema (backend/frontend)
- [ ] Definición del flujo de trabajo de desarrollo (ramas develop/feature pendientes de crear)
- [ ] Preparación del entorno de desarrollo (falta scaffold de Next.js)

### Pendiente
- [ ] Configuración del frontend (Next.js)
- [ ] Recuperación de contraseña (requiere decidir proveedor de email)
- [ ] Invitación formal de miembros a un hogar existente (hoy el registro solo permite unirse pasando un householdId ya conocido)
- [ ] Dashboard inicial
- [ ] Módulo de ingresos
- [ ] Módulo de pagos recurrentes
- [ ] Módulo de reportes
- [ ] Integración de IA básica

## Resumen de avance
- Documentación de producto: 100%
- Planeación técnica: 65%
- Implementación: 30% (base de datos + backend NestJS + autenticación completa; falta frontend y módulos de negocio)

## Próximos pasos
1. Scaffold del frontend Next.js (incluyendo pantallas de login/registro consumiendo /auth).
2. Implementar recuperación de contraseña e invitación de miembros al hogar.
3. Implementar primer dashboard.
