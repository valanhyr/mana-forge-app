# Tareas: triage de usuarios en Frontdesk

Estado global: **implementado en la rama `feature/frontdesk-user-triage`**;
regresión automática verde. Pendiente: validación manual local y revisión/merge.
Spec: [spec.md](spec.md) · Plan: [plan.md](plan.md).

| Tarea | Criterio | Estado | Evidencia |
|---|---|---|---|
| T-01: definir DTO de filtros y validación de `sort`, `dir`, `tier`, `status`, `quota` | AC-01 | Hecha | `FrontdeskUserQuery.parse` + `FrontdeskUserQueryTest` (4 pruebas) |
| T-02: prueba roja de valores inválidos y de compatibilidad sin parámetros | AC-01 | Hecha | Rojo de compilación observado antes de implementar (`cannot find symbol FrontdeskUserQuery`); verde en `FrontdeskUserQueryTest` |
| T-03: `FrontdeskBadRequestException` + manejo en `FrontdeskExceptionHandler` con `{code, error}` | AC-01 | Hecha | `FrontdeskExceptionHandlerTest` (400 + `code` + `error`) |
| T-04: prueba roja del enriquecido por lotes (mazos, recientes, cuota) y `verify` sin consultas por usuario | AC-06 | Hecha | `pageEnrichmentBatchesMetricsInsteadOfQueryingPerUser` verifica `never()` en conteo por usuario y `checkAuthenticated(List.of("u1"))` |
| T-05: `FrontdeskUserService.viewPage` y cálculo por lotes; `view(user)` intacto | AC-06, AC-07 | Hecha | `viewPage` comparte `buildView`; el detalle conserva sus consultas y sus pruebas originales |
| T-06: `AiQuotaService.checkAuthenticated(Collection)` con `multiGet` troceado y fallback | AC-03, AC-06 | Hecha | `batchQuota_readsCountersInOneCall`, `batchQuota_chunksLargeUserSets` (600 → 2 llamadas), `batchQuota_fallsBackToMemory` |
| T-07: prueba roja del camino nativo (orden, `skip`/`limit`, `total` filtrado) | AC-01, AC-07 | Hecha | `nativeOrderStaysInMongoAndKeepsTheFilteredTotal` (skip 50, limit 25, `username`/`_id` asc) |
| T-08: prueba roja de ranking por tickets, IA y mazos, incluyendo desempates | AC-02, AC-03, AC-05 | Hecha | `openTicketsSortOrdersTheWholeFilteredSetBeforePaginating`, `openTicketsTiesBreakByMostRecentLoginThenId`, `aiUsageSortUsesTodaysAuthenticatedCounter` (incluye consumo 0 al final), `deckSortOrdersByTotalDecksAcrossTheFilteredSet` |
| T-09: implementar camino rankeado con máximo 20.000 y 400 `USER_SET_TOO_LARGE` | AC-02, AC-03, AC-12 | Hecha | `rankedPage` + `ensureRankable`; `unreasonablyLargeRankedSetsFailInsteadOfTruncating` |
| T-10: pruebas rojas e implementación de filtros tier, estado efectivo y cuota agotada | AC-04 | Hecha | `exhaustedQuotaFilterNarrowsItemsAndTotal`, `unlimitedQuotaIsNeverExhausted`, `suspendedFilterHonoursTheLegacyActiveFlag` |
| T-11: paginación estable: prueba de dos páginas consecutivas por cada orden | AC-05 | Hecha | `consecutiveRankedPagesDoNotRepeatOrSkipUsers` (páginas 0 y 1 sin solaparse); orden nativo cubierto por desempate `_id` en Mongo |
| T-12: repositorio HTTP y puerto con `UserListFilters`; prueba de parámetros enviados | AC-01, AC-07 | Hecha | `sends directory ordering and filters, omitting empty values` y `does not send directory filters the operator did not choose` |
| T-13: mock de usuarios con mismo orden, filtros y desempates | AC-08 | Hecha | `should order the whole directory by open tickets...`, `should order by today AI usage`, `should filter by tier, status and exhausted quota`, `should keep the legacy alphabetical order...` |
| T-14: hook de listado con clave de filtros y hook de conteo de cuota agotada | AC-10 | Hecha | `useUsersPage(filters, page, size, enabled)` con todos los filtros en la clave; `useExhaustedQuotaCount` |
| T-15: `UserFilterBar` accesible con orden, dirección, tier, estado, cuota y limpiar | AC-09 | Hecha | `UserFilterBar.test.tsx` (4 pruebas, controles etiquetados y limpiar condicional) |
| T-16: `UsersView` con orden por defecto, debounce, resumen, estado vacío y reinicio de página | AC-02, AC-09 | Hecha | `UsersView.test.tsx` (petición por defecto y vacío) + `use-debounced-value.test.ts` |
| T-17: `UserCard` con `SUSPENDED`, uso de IA con límite/periodo y tickets destacados | AC-09 | Hecha | `UserCard.tsx`: `ShieldX`, `usado/límite`, tickets abiertos en ámbar y etiquetas traducidas |
| T-18: claves nuevas en `labels.json` (`en` y `es`) | AC-09 | Hecha | 25 claves nuevas por idioma; paridad verificada por `labels.test.ts` en la suite |
| T-19: dashboard «Quotas Exhausted» con conteo global | AC-10 | Hecha | `DashboardView` usa `useExhaustedQuotaCount`; el KPI ya no depende de los 25 primeros |
| T-20: actualizar `docs/frontdesk-api.md` con los parámetros y el default | AC-01, AC-07 | Hecha | Fila de `/users` ampliada y párrafo con defaults, códigos 400 y `USER_SET_TOO_LARGE` |
| T-21: regresión completa y validación manual local (mock y API) | AC-11 | Parcial | Regresión automática verde (ver abajo). Validación manual en navegador **no ejecutada** |

## Evidencia de validación

Comandos y resultados realmente ejecutados el 2026-10-22:

- Backend dirigido (rojo): `.\mvnw.cmd -q "-Dtest=FrontdeskUserQueryTest,FrontdeskUserServiceTest,AiQuotaServiceTest,FrontdeskQueryServiceTest,FrontdeskExceptionHandlerTest" test`
  → `COMPILATION ERROR: cannot find symbol FrontdeskUserQuery / FrontdeskBadRequestException`.
- Backend dirigido (verde): mismos `-Dtest` → 40 pruebas, 0 fallos. Tras añadir
  paginación estable: `FrontdeskUserServiceTest` → 17 pruebas, 0 fallos.
- Backend completo: `.\mvnw.cmd test` → **415 pruebas, 0 fallos, BUILD SUCCESS**
  (incluida la prueba de paginación estable añadida al final).
- Frontend dirigido: `npx vitest run src/infrastructure src/hooks src/components/users src/views/UsersView.test.tsx`
  → 62 pruebas, 0 fallos.
- Frontend completo: `npx vitest run --maxWorkers=1` → **108 pruebas, 0 fallos**
  (20 archivos). Sin `--maxWorkers=1`, `src/test/build-assets.test.ts` agota sus
  30 s por contención al compilar Vite en paralelo; aislado también pasa.
- Frontend build: `npm run build` (`tsc -b && vite build`) → correcto.
- `mana-forge-frontdesk` no define script `lint`; no se ejecutó lint.

## Limitaciones y riesgos residuales

- La forma de las agregaciones (`$group` + `$push` + `$sum` de `cards.quantity`)
  está cubierta con `MongoTemplate` simulado, **no** contra un Mongo real. No hay
  pruebas de integración de Mongo en el repo para este servicio.
- La validación manual (modo mock y API local) queda pendiente; no se marcó como
  ejecutada.
- El primer rojo se observó en el backend como fallo de compilación. En el
  frontend las pruebas se escribieron antes de la implementación, pero el primer
  rojo no se ejecutó por separado; no se afirma lo contrario.
- No se crearon índices, no se migraron datos y no se desplegó nada.

## Pendiente de autorización

- Crear índices en Mongo (`tickets(userId, status)`): **no** forma parte de este
  alcance.
- Persistencia de uso de IA (fase F3): fuera de alcance.
- Despliegue en cualquier entorno: no autorizado por la aprobación de la spec.
