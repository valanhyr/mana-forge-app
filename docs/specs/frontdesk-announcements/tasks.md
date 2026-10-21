# Tareas y evidencia: comunicados globales de servicio

- Estado: `in-progress`; spec y plan aprobados por el usuario el 2026-10-21 («ok»).
  Sin autorización de despliegue, migración de datos ni cambios de permisos en Directus.
- Referencias: [spec](spec.md) y [plan](plan.md).

## Tareas

| Hecho | ID | Tarea / entrega | AC | Depende de |
|---|---|---|---|---|
| [x] | T-01 | Aprobación explícita de spec y plan. | todos | — |
| [x] | T-02 | Modelo/repositorio `AnnouncementCampaign` e idempotencia. | AC-09 | T-01 |
| [x] | T-03 | Elegibilidad y listado de destinatarios. | AC-01, AC-02 | T-02 |
| [x] | T-04 | Canal `sendAnnouncement` y validación de categorías. Ejecutor: se comparte `newsletterExecutor` (un worker, SMTP serializado, sin configuración nueva). | AC-03, AC-04, AC-13 | T-01 |
| [x] | T-05 | Servicio de campaña: validación, idempotencia, límites. | AC-05, AC-09 | T-02, T-04 |
| [x] | T-06 | Dispatcher: recarga, omisiones, fallos, acceso revocado. | AC-06, AC-07, AC-08 | T-03, T-05 |
| [x] | T-07 | Rutas del controlador y control de acceso. | AC-10 | T-05, T-06 |
| [x] | T-08 | Dominio, puerto, adaptadores HTTP/mocks y hooks del frontend. | AC-11 | T-07 |
| [x] | T-09 | `AnnouncementComposer`, `AnnouncementPanel`, pestaña, textos es/en. | AC-11, AC-12 | T-08 |
| [x] | T-10 | Suites completas y tipos. | AC-13 | T-09 |
| [ ] | T-11 | Validación manual con SMTP de pruebas, teclado y lector de pantalla. | AC-03, AC-11, AC-12 | T-10 |
| [ ] | T-12 | `docs/frontdesk-api.md` actualizado; falta `ARCHITECTURE.md`. | todos | T-10, T-11 |

## Registro TDD

Los tests se escribieron antes que el código. Rojo observado: `mvnw test-compile` falló con
«cannot find symbol» / «package AnnouncementDtos does not exist» antes de implementar.
Rojo de comportamiento no observado por separado en el frontend: los tests nuevos y el código se
ejecutaron juntos tras implementar; no se afirma lo contrario.

## Evidencia de ejecución, 2026-10-21 (Windows)

| Comprobación | Resultado |
|---|---|
| `.\mvnw.cmd test` en `mana-forge-api` | 393 tests, 0 fallos, BUILD SUCCESS |
| `npx vitest run` en `mana-forge-frontdesk` | 17 archivos, 95 tests, todos pasan |
| `npx tsc --noEmit` en `mana-forge-frontdesk` | sin errores |
| `npm run lint` en `mana-forge-frontdesk` | no existe el script `lint` en este paquete; no ejecutado |

## Bloqueos y notas

- Validación legal del envío sin consentimiento de newsletter: pendiente, fuera del código.
- Hay que crear plantillas `ANNOUNCEMENT` en Directus a mano. Es opcional: sin plantilla se
  puede redactar en texto plano.
- Pendiente de confirmar por separado: despliegue. No hay migración de datos: la colección
  `announcement_campaigns` se crea en el primer uso.
