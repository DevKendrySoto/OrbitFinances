
# Planificador Financiero Familiar - PRD (Versión Web)

## Visión
Aplicación web enfocada en planificación financiera familiar, control de pagos recurrentes, flujo de caja y recomendaciones inteligentes. No busca ser un sistema contable, sino un copiloto financiero.

## Documentación complementaria
- Contexto general: [contexto.md](contexto.md)
- Seguimiento de tareas: [seguimiento.md](seguimiento.md)
- Flujo de trabajo: [flujo-de-trabajo.md](flujo-de-trabajo.md)
- Stack técnico: [stack-tecnico.md](stack-tecnico.md)
- Arquitectura: [arquitectura.md](arquitectura.md)
- Glosario: [glosario.md](glosario.md)
- Proceso y estado: [proceso.md](proceso.md)

---

# Stack Tecnológico

## Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Recharts
- Framer Motion
- PWA

## Backend
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis (fase futura)

## Infraestructura
- Docker
- Docker Compose
- Nginx
- GitHub Actions
- VPS o Google Cloud

---

# Arquitectura

## Clean Architecture
- app
- features
- shared
- components
- services
- hooks
- lib
- stores

Cada módulo será independiente.

---

# Roles

## Administrador
- Gestión completa
- Configuración
- Usuarios
- Ingresos
- Pagos

## Miembro (Esposa)
- Consultar dashboard
- Ver pagos
- Registrar pagos si se habilita
- Sin acceso a configuración crítica

---

# Módulos

## 1. Autenticación
- Registro
- Login
- Recuperación
- JWT
- Refresh Token
- Cierre de sesión

## 2. Dashboard
Mostrar:
- Dinero disponible
- Dinero comprometido
- Dinero realmente disponible
- Ahorro USD
- Próximos pagos
- Estado del mes
- Recomendaciones IA

## 3. Hogar
- Un hogar compartido
- Ingresos de ambos miembros
- Gestión de miembros
- Presupuesto familiar

## 4. Ingresos
- Freelancer
- Salario esposa
- Edición mensual
- Historial

## 5. Conversión USD -> DOP
- Conversiones parciales
- Historial
- Saldo restante en USD
- Tasa aplicada

## 6. Pagos Recurrentes
- Crear
- Editar
- Eliminar (solo futuros)
- Marcar pagado
- Historial
- Generación automática del siguiente mes
- Prioridad:
  - Crítico
  - Importante
  - Opcional

## 7. Calendario
- Mensual
- Quincenal
- Próximos pagos
- Pagos vencidos

## 8. Gastos Variables
Categorías simples:
- Supermercado
- Colmado
- Comida
- Transporte
- Salidas
- Otros
- Imprevistos

## 9. Metas
- Fondo de emergencia
- Objetivo
- Progreso
- Recomendación de ahorro

## 10. Reportes
- Diario
- Quincenal
- Mensual
- Histórico
- Cierre mensual

## 11. Configuración
- Perfil
- Seguridad
- Preferencias

---

# IA

- Detectar sobregastos
- Proyección fin de mes
- Disponible real
- Simulador de compra
- Recomendación de ahorro
- Alertas de riesgo

---

# Flujo principal

1. Registrar ingreso.
2. Registrar conversiones USD→DOP.
3. Recalcular flujo.
4. Mostrar pagos pendientes.
5. Marcar pagos.
6. Registrar gastos rápidos.
7. IA analiza la situación.

---

# Seguridad

- HTTPS
- Argon2
- JWT + Refresh Token
- Roles y permisos
- Validación con Zod
- Rate limiting
- Auditoría
- PIN/Biometría (PWA compatible)
- Variables de entorno
- Principio de mínimo privilegio

---

# Reglas de negocio

1. Nunca eliminar historial financiero.
2. Los pagos recurrentes generan automáticamente el siguiente período.
3. El disponible real = ingresos + saldo - pagos pendientes.
4. Un ingreso USD admite múltiples conversiones.
5. Todos los movimientos quedan auditados.
6. El cierre mensual es inmutable.
7. La IA solo recomienda, nunca modifica datos.

---

# Roadmap

## Sprint 1
- Base del proyecto
- Autenticación
- Layout
- Dashboard inicial

## Sprint 2
- Hogar
- Ingresos
- Conversión USD

## Sprint 3
- Pagos recurrentes
- Calendario
- Recordatorios

## Sprint 4
- Gastos variables
- Reportes
- Cierre mensual

## Sprint 5
- IA
- Simulador
- Metas
