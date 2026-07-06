# Flujo de Trabajo del Proyecto

## Objetivo
Establecer un proceso claro para desarrollar Orbitfinc con orden, trazabilidad y calidad.

## Rama de trabajo
- main: código estable y listo para producción.
- develop: integración de nuevas funciones.
- feature/*: desarrollo de funcionalidades específicas.
- hotfix/*: correcciones urgentes.

## Ciclo de desarrollo
1. Crear una rama desde develop.
2. Implementar la funcionalidad o mejora.
3. Ejecutar pruebas y revisión de calidad.
4. Abrir un pull request hacia develop.
5. Revisar, aprobar y fusionar.
6. Desplegar solo cuando esté validado.

## Convención de commits
Usar mensajes claros y consistentes:
- feat: nueva funcionalidad
- fix: corrección de errores
- docs: cambios en documentación
- refactor: mejoras internas sin cambiar comportamiento
- chore: tareas de mantenimiento

Ejemplo:
- feat: agregar módulo de pagos recurrentes
- fix: corregir cálculo del disponible real

## Definition of Done
Una tarea se considera terminada cuando:
- está implementada y documentada;
- pasa las pruebas o validaciones correspondientes;
- no genera errores evidentes en el flujo principal;
- está lista para revisión por otro miembro del equipo.

## Revisión de código
Cada pull request debe incluir:
- descripción breve del cambio;
- evidencia de pruebas realizadas;
- impacto esperado;
- notas de despliegue si aplica.

## Ritmo de trabajo recomendado
- reuniones semanales de seguimiento;
- revisión de tareas por sprint;
- actualización del archivo de seguimiento tras cada avance importante.
