# Plan: contratos y persistencia de usuario

Estado: **done** (entrega local, no despliegue). Referencia: [spec](spec.md). Fecha: 2026-10-17.
D-01–D-05 y fases P-1–P-4 aprobadas por el usuario («ok», 2026-10-17).

## Diseño propuesto

### Fronteras de datos

- DTO de registro independiente de `User`; construir una entidad nueva con defaults
  del servidor. Campos extra ignorados de forma explícita y probada, no copiados.
- Reutilizar la proyección pública para social; mantener un contrato propio distinto
  para login/perfil. Mapear sin descifrar emails cuando el consumidor no los necesita.
- Fechas aditivas en perfil propio y Frontdesk, sin renombrar `userId`/`id` ni rutas.
- Modelos frontend separados para público/propio; normalizar fechas ausentes a `null`
  en las fronteras HTTP. Mocks y pruebas reflejan JSON real y privacidad.

### Persistencia

Introducir operaciones explícitas de escritura de usuario, reutilizando el estilo
de `MongoTemplate`/repositorios existentes. No es un CRUD genérico ni un servicio
para reescribir toda la arquitectura. Inventariar cada escritor antes de sustituirlo:

| Escritor actual | Tratamiento propuesto |
|---|---|
| `UserController`: alta | Insertar usuario nuevo; tres fechas según modalidad; nunca ID del cliente. |
| `UserController`: perfil | `$set` solo de campos cambiados; validar todo antes de persistir y actualizar sesión después. |
| `UserController`: contraseña | Comparar hash vigente al actualizar; no sobrescribir un cambio de contraseña posterior. |
| `UserController`: verificación | Condicionar al token/email pendiente vigentes; promoción de email e invalidación del consentimiento en la misma escritura. |
| `OAuth2LoginSuccessHandler` y login local | Actualización de login monotónica, sin guardar una copia completa. Mantener reglas de acceso actuales. |
| `FriendController` | `$addToSet`/`$pull` por ID, conservando independencia de campos y detectando operaciones sin cambios. |
| `FrontdeskUserService` | Conservar actualización parcial de estado/active y añadir modificación efectiva. |
| `NewsletterService` | Conservar cambios parciales; comprobar suscripción/token vigentes donde haga falta y mantener idempotencia. |
| `EmailMigrationRunner` | Sustituir reemplazo completo por actualización condicionada al email original; no ejecutar el runner contra una base real como validación. |

Rutas relativas a `mana-forge-api/src/main/java/com/manaforge/api/`.

Usar tiempo controlable en pruebas y serialización a precisión Mongo. Para updates,
`$max` sobre las fechas evita retrocesos por ejecución fuera de orden; predicados
de cambio/precondiciones evitan actualizar `updatedAt` por no-ops o conflictos.
Creación se fija únicamente al insertar, no mediante auditoría que rellene legado.
Devolver el documento persistido cuando la respuesta incluya fechas, no la copia
previa a una actualización parcial. No asumir que `@LastModifiedDate` cubre updates
directos ni que `save()` equivale a un PATCH.

Comparaciones sensibles fallidas requieren relectura limitada para distinguir
cuenta ausente, credencial/token inválido y conflicto. No hacer reintentos
automáticos con efectos SMTP. Los tests fijarán esa distinción y verificarán cero
correos/cambios de sesión ante fallo de persistencia. La protección de campos ajenos
no implica transacciones entre ambos usuarios de una amistad o con `audit_events`.

### Alternativas descartadas

| Alternativa | Motivo |
|---|---|
| Solo añadir `updatedAt` al modelo | No cubre todos los escritores ni evita pérdidas concurrentes. |
| Auditoría Mongo global | No resuelve por sí sola updates directos y puede inventar creación en históricos. |
| `@Version` y reemplazos completos en todas las rutas | Introduce conflictos sobre campos independientes y cambia todas las escrituras existentes; preferir operaciones acotadas y condiciones. |
| Fechas derivadas de ObjectId | Generación de ID no garantiza alta real; tampoco aporta modificación. |
| Campos privados anulados dentro de un único DTO | Mantiene un contrato ambiguo y facilita filtraciones en nuevos mapeos. |

## Fases y dependencias

| Fase | Entrega | Dependencias |
|---|---|---|
| P-0 | Aprobar spec, decisiones y plan; registrar autorización. | Preparación documental actual. |
| P-1 | Cerrar entrada de registro y proyecciones públicas/sociales; alinear tipos/mocks afectados. | P-0. |
| P-2 | Introducir `updatedAt` y operaciones parciales/condicionales; cubrir todos los escritores de usuario. | P-1. |
| P-3 | Fechas en contrato propio/Frontdesk, compatibilidad y presentación de modificación en Frontdesk. | P-2. |
| P-4 | Regresión completa, documentación vigente y cierre con evidencia. | P-1–P-3. |
| P-5 | Preparar consultas operativas de solo lectura e interpretar resultados si se autoriza su ejecución en un entorno identificado. | Independiente; no bloquea código probado localmente, sí la afirmación de cierre de DB real. |

Cada fase de comportamiento sigue rojo → mínimo verde → refactor → regresión.
Consultar [tasks](tasks.md) para el vínculo con criterios y evidencia.

## Archivos y pruebas

Archivos principales existentes verificados:

- API: `model/mongo/User.java`, `repository/UserRepository.java`,
  `dto/UserDto.java`, `dto/PublicUserDto.java`, `dto/FrontdeskDtos.java`, los
  controladores y servicios del inventario; `FollowController` y `MessageController`
  para proyecciones sociales. Nuevos helpers/DTOs solo si reducen duplicación.
- Web: `src/core/models/User.ts`, `src/services/AuthService.ts`, `FriendService.ts`,
  `FollowService.ts`, `MessageService.ts` y consumidores/tests/mocks relacionados.
- Frontdesk: `src/core/domain/user.ts`, `src/infrastructure/api/http-repositories.ts`,
  `src/components/users/User360View.tsx`, labels y fixtures relacionados.
- Documentación final: `docs/frontdesk-api.md` y secciones afectadas de
  `ARCHITECTURE.md`; no describir la propuesta como ya implementada.

Rutas API anteriores relativas al paquete principal. Las pruebas del paquete API
están bajo `src/test/java/com/manaforge/api/`.

| Nivel | Evidencia requerida |
|---|---|
| Controlador API | Registro malicioso, email inválido, DTOs propios/públicos/sociales y anidados, fechas y permisos. Ampliar `UserControllerTest` y añadir cobertura social inexistente si procede. |
| Persistencia Mongo embebido | BSON ausente/nulo/Date; intercalaciones deterministas de dos lecturas/escrituras, arrays atómicos, monotonicidad y no-ops en `UserRepositoryTest` u otro test específico. No basarse solo en mocks. |
| Servicios | `OAuth2LoginSuccessHandlerTest`, `FrontdeskUserServiceTest`, `NewsletterServiceTest` y pruebas del runner/operaciones nuevas: fechas y precondiciones obsoletas. |
| Adaptadores/UI | `AuthService.test.ts`, `UserContext.test.tsx`, pruebas de servicios sociales, `http-repositories.test.ts`, `User360View.test.tsx`: payloads reales, datos privados ausentes y fechas desconocidas. |
| Recorridos | Alta/verificación/login local, alta/login Google simulado, perfil, amistad, moderación y newsletter; sin SMTP ni OAuth externos reales. |

Comandos disponibles, desde cada servicio:

```powershell
# mana-forge-api
.\mvnw.cmd test

# mana-forge-web
npx --no-install vitest run
npm run lint
npx --no-install tsc --noEmit

# mana-forge-frontdesk
npx --no-install vitest run
npm run build
npx --no-install tsc --noEmit
```

Ejecutar primero subconjuntos por tarea y después las suites anteriores; registrar
errores del entorno sin ocultarlos. Frontdesk no tiene script `lint`.

## Compatibilidad y operación

- Desplegar API antes de clientes que usan fechas. Clientes nuevos toleran API vieja.
  Retirar email social es una reducción intencional del contrato, no un campo nuevo;
  verificar todos los consumidores del monorepo y comunicar la restricción.
- Mantener cifrado determinista y búsqueda exacta del email, sesiones y permisos
  existentes. No introducir normalización/migración global de identificadores.
- No ejecutar el arranque normal de la API para una comprobación contra Mongo real:
  el runner existente puede escribir. Diagnóstico operativo con conexión de solo
  lectura y agregados sin PII, sin leer `.env` ni publicar credenciales.
- P-5 debe comprobar tipos/presencia de fechas, versión desplegada, índices y
  conteos de duplicados de username/email sin listar direcciones, tokens ni hashes.
  Un índice compuesto `{username, _id}` no demuestra unicidad de username.
- No preparar/aplicar índices únicos hasta revisar duplicados, compatibilidad y
  obtener aprobación separada. No prometer unicidad concurrente sin ese respaldo.
- Cambios aditivos de fechas no requieren backfill. Un rollback del código no borra
  campos y no incluye deshacer datos ni correos; el código antiguo conserva su
  riesgo de reemplazos completos, por lo que un rollback no es una operación neutra.

## Aprobación

Aprobadas D-01–D-05 y fases P-1–P-4 («ok», 2026-10-17). Operaciones externas y
cambios sobre datos reales permanecen fuera de esa autorización.
