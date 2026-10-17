# Tareas y evidencia: datos de usuario

Estado: **done** (implementación y validación local); [spec](spec.md) y [plan](plan.md) aprobados.
Fecha: 2026-10-17.

## Seguimiento

| Estado | Tarea | Criterios | Dependencias / evidencia |
|---|---|---|---|
| [x] | T-01: auditar flujo y preparar spec/plan con decisiones pendientes. | Preparación de AC-01–AC-10; no los satisface por sí sola. | Revisión de código e historial descrita en spec; validación documental registrada debajo. |
| [x] | T-02: obtener y registrar aprobación de D-01–D-05 y fases autorizadas. | AC-10 | Usuario: «ok», 2026-10-17. Sin autorización de producción. |
| [x] | T-03: probar y cerrar registro con DTO explícito y defaults seguros. | AC-01 | Rojo/verde y regresión API; registro seguro también frente a logs de validación. |
| [x] | T-04: probar y separar perfiles públicos/sociales y propios, incluidos anidados; alinear registro y mocks web. | AC-06, AC-07 | Siete proyecciones en `SocialUserContractTest` y servicio web. |
| [x] | T-05: probar BSON histórico, altas y operaciones de fecha; introducir modificación sin inferir creación. | AC-01–AC-04 | `UserDataFlowTest`, `UserRepositoryTest`, `OAuth2LoginSuccessHandlerTest`. |
| [x] | T-06: probar intercalaciones y sustituir guardados completos de perfil/contraseña/verificación por updates acotados y condicionales. | AC-04, AC-05 | Copias obsoletas y condiciones de contraseña/token en Mongo real embebido. |
| [x] | T-07: probar login monotónico, amistad atómica, moderación y newsletter sin pérdida de campos ni cambios por no-op. | AC-03–AC-05 | Fechas/no-ops, arrays y consentimiento, incluidas preferencias históricas ausentes. |
| [x] | T-08: probar runner de cifrado condicionado al email vigente y sin reemplazo de documento. | AC-04, AC-05 | Runner sobre Mongo embebido; preserva email concurrente y campos no mapeados. |
| [x] | T-09: probar fechas en contrato propio/Frontdesk, clientes con API antigua y presentación/labels. | AC-02, AC-07, AC-08 | Adaptadores y React; fechas desconocidas, contrato API y build. |
| [x] | T-10: preparar diagnóstico de solo lectura sin PII; registrar ejecución autorizada o limitación. | AC-09, AC-10 | `docs/user-data-contracts.md`; sintaxis con DB simulada. Acceso real no ejecutado. |
| [x] | T-11: ejecutar regresiones, tipos/lint/build y recorridos del alcance; actualizar contratos y arquitectura. | AC-01–AC-10 | API 372, web 266 y Frontdesk 90 correctas; tipos/lint/build y revisión documental. Límites debajo. |

## Ejecución autorizada

- P-1 API rojo: `UserControllerTest#registrationIgnoresFriendsAndPendingEmail`
  conserva amigos/email pendiente forjados; `SocialUserContractTest` encuentra email
  privado en JSON. La primera prueba de email tenía un mock de save incompleto;
  corregido el fixture, `registrationRequiresAValidEmail` falla con 201 en vez de 400.
- P-1 API verde: `.\mvnw.cmd test "-Dtest=UserControllerTest,SocialUserContractTest"`:
  **48 pruebas, sin fallos/errores**. DTO de entrada explícito y proyección social
  pública, incluidos siete tipos de respuestas con usuarios anidados.
- Web rojo: `AuthService.test.ts`: **1 fallo esperado, 20 correctas**; API antigua
  devuelve fechas ausentes en lugar de normalizarlas a null.
- Web verde: mismo archivo, **21 pruebas correctas**; respuesta pública de registro
  y normalización de fechas en login/perfil propio.
- P-2 Mongo rojo: `UserDataFlowTest` reproduce falta de modificación, retroceso de
  login y pérdida de campos al guardar una copia antigua. La primera simulación con
  spy de proxy Spring no era válida; sustituida por mock delegante, el escenario de
  baneo falla por restaurar estado nulo. No se cuenta el error de fixture como rojo.
- P-2 Mongo verde inicial: `UserDataFlowTest,UserRepositoryTest`, **11 correctas**.
- P-2 siguiente rojo: `UserDataFlowTest,OAuth2LoginSuccessHandlerTest`, **5 fallos
  esperados de 20 pruebas**: código de conflicto, runner, newsletter, amistad y
  modificación en alta Google. Moderación se ejecuta aparte y falla por fecha ausente.
- Frontdesk rojo: **3 fallos esperados de 15 pruebas** por falta de fecha/label de
  modificación y normalización. Verde: mismos dos archivos, **15 correctas**.
- Primera regresión amplia: web excede 120 s sin completar; Frontdesk obtiene
  88 correctas y 1 timeout del test de build (30 s) mientras había varias suites
  concurrentes. No se marca esta ejecución como verde; repetir con menos trabajadores.
- Regresión API del alcance: ocho clases, **101 pruebas correctas**, incluidas
  integración con Mongo y permisos/controladores. Aún sin las nuevas pruebas de
  borde de preferencia histórica añadidas después.
- Newsletter histórico rojo: con `newsletterSubscribed` realmente ausente, la
  suscripción falla por 409 debido al default Java false frente a BSON missing.
  Se hace equivalente false/null/ausente solo en esa precondición; el caso de email
  cambiado concurrentemente ya es verde y se registra como caracterización.
- Web conflicto rojo: 1 fallo de 22 por convertir `CONCURRENT_UPDATE` en
  `USERNAME_TAKEN`; se conserva el error concurrente para la UI de error general.
- Frontdesk regresión completa con `--maxWorkers=1`: **89 pruebas, 16 archivos
  correctos**, incluido test de assets. `npm run build` y `npx --no-install tsc --noEmit`
  correctos. Web: lint, `tsc --noEmit` y `tsc -p tsconfig.app.json --noEmit` correctos.
- Bordes Mongo/consentimiento verde: `NewsletterServiceTest,UserDataFlowTest`,
  **25 pruebas correctas**. Incluye preferencia realmente ausente, arrays nulos,
  duplicación/no-ops de amigos, token obsoleto, runner condicionado y campos no
  mapeados, login local persistido y reloj fijo. Casos ya verdes se consideran
  caracterización/regresión, no se inventa rojo para ellos.
- Web conflicto verde: `AuthService.test.ts`, **22 pruebas correctas**.
- Validación segura de registro rojo: `invalidRegistrationDoesNotLogOrEchoPassword`
  detecta contraseña corta en el WARN del resolver por defecto de Bean Validation.
  Se añade handler local de validación que devuelve error genérico sin valores,
  evitando ampliar el cambio de errores a otros controladores. Verde confirmado
  en suite completa. Los valores de prueba son ficticios.
- Web completa previa al último ajuste de conflicto: **265 pruebas, 40 archivos
  correctos** con dos trabajadores. Se repite sobre el código final.
- Suite completa API sobre el código final: `.\mvnw.cmd test`, **370 pruebas,
  0 fallos/errores/omitidas**. Incluye el verde de validación sin contraseña en logs.
  Se añaden después únicamente pruebas de caracterización de BSON nulo explícito,
  conflicto de persistencia/sesión y presentación española; se repiten las suites
  afectadas para registrar también esos escenarios.
- Web final: `npx --no-install vitest run --maxWorkers=2`, **266 pruebas en 40
  archivos correctos**; lint y ambas comprobaciones TypeScript correctas.
- Documentación: **5 documentos, 12 enlaces locales correctos**, sin espacios
  finales. Los cuatro ejemplos JavaScript de diagnóstico se validan con `node:vm`
  y una DB simulada que solo ofrece lectura: **sin conexión Mongo**. `git diff --check`
  correcto. TDD no aplicable a la preparación de esas consultas/documentación.
- Regresión final ampliada: `.\mvnw.cmd test`, **372 pruebas, 0 fallos/errores/omitidas**;
  `npx --no-install vitest run --maxWorkers=2` en Frontdesk, **90 pruebas en 16 archivos
  correctos**. Los añadidos de caracterización cubren BSON missing/null por separado,
  persistencia fallida sin cambiar sesión/enviar correo, fecha de modificación real
  en el DTO de Frontdesk y label española con una fecha conocida.
- La suite API imprime avisos de deprecaciones/Flapdoodle, errores de cierre del
  event loop Netty/Lettuce y avisos JaCoCo por datos anteriores; **sin pruebas fallidas**.
  No se calcula ni se afirma cobertura a partir de ese informe acumulado.

## Cierre por criterio

| Criterio | Evidencia principal |
|---|---|
| AC-01 | Registro malicioso/validación en `UserControllerTest`, alta local en `UserDataFlowTest`, alta Google en `OAuth2LoginSuccessHandlerTest`. |
| AC-02 | `legacyReadDoesNotWriteAndProfileStartsOnlyModificationDate` con BSON ausente y nulo explícito; adaptadores y UI sin fecha inventada. |
| AC-03 | Login monotónico, aceptado/rechazado/restauración de sesión en Mongo; rechazo Google existente y fechas de alta en su handler. |
| AC-04 | Perfil, contraseña, verificación, amistad, estado, newsletter y runner con updates explícitos; no-ops y reloj fijo en Mongo. |
| AC-05 | Copia de perfil/amistad previa a baneo, contraseña/token/email obsoletos, condiciones de consentimiento y sesión/correo sin efectos ante conflicto. |
| AC-06 | Siete proyecciones públicas/sociales y anidadas, sin descifrado ni datos privados, en `SocialUserContractTest`. |
| AC-07 | Tipos/mocks de registro y perfil; `AuthService.test.ts` y adaptadores Frontdesk, con fechas ausentes normalizadas a null. |
| AC-08 | `User360View.test.tsx`: fecha desconocida/conocida y label española; build/TypeScript de Frontdesk correctos. |
| AC-09 | Diagnóstico preparado sin PII ni operadores de escritura, validado sintácticamente con DB simulada. Ejecución real explícitamente pendiente. |
| AC-10 | Suites completas y comandos registrados; documentación alineada, sin despliegue, backfill ni índices/correo reales. |

## Evidencia de la revisión previa (no es TDD nuevo)

Ejecutada el 2026-10-17 en este workspace, antes de crear esta spec. Estas pruebas
caracterizan parte del comportamiento actual; no prueban los cambios propuestos.

| Servicio | Comando | Resultado |
|---|---|---|
| API | `.\mvnw.cmd test "-Dtest=UserControllerTest,UserRepositoryTest,OAuth2LoginSuccessHandlerTest,FrontdeskUserServiceTest"` | 64 pruebas, 0 fallos/errores/omitidas. Mongo embebido en repositorio, mocks en otros niveles. |
| Web | `npx --no-install vitest run src/__tests__/unit/services/AuthService.test.ts src/__tests__/contexts/UserContext.test.tsx src/__tests__/views/ProfilePreferences.test.tsx` | 32 pruebas, 3 archivos correctos. |
| Frontdesk | `npx --no-install vitest run src/infrastructure/api/http-repositories.test.ts src/components/users/User360View.test.tsx` | 14 pruebas, 2 archivos correctos. |

La ejecución de API avisó de deprecaciones y datos JaCoCo anteriores incompatibles
con algunas clases; no se atribuye un porcentaje de cobertura a esta ejecución.
No se han ejecutado las suites completas, lint o build como parte de esta revisión.

## Preparación documental inicial

- En la preparación inicial solo se añadieron `spec.md`, `plan.md` y este archivo,
  sin cambios de producción. La implementación posterior está registrada arriba.
- TDD: **no aplicable a esta preparación**, porque no cambia comportamiento.
- Validación documental ejecutada mediante script PowerShell: **3 documentos,
  9 enlaces locales y 13 rutas principales correctos; sin espacios finales**.
- La evidencia previa no se ha repetido ni reinterpretado como rojo/verde de estas
  tareas. Cada tarea nueva registrará comando, motivo del rojo y resultado verde.

## Bloqueos y límites

- Alcance de código/documentación aprobado, implementado y validado localmente.
- Base real no consultada; desconocidos: datos históricos, duplicados, índices y
  versión desplegada. No hay autorización específica para acceso operativo real.
- Sin backfill, índices aplicados, despliegue, correo real ni cambio de cifrado.
- No se ha hecho recorrido manual en navegador ni OAuth/SMTP real. Las pruebas
  integran controladores con Mongo embebido y simulan HTTP/Google/correo según nivel;
  no se presentan como un E2E completo ni como inspección de producción.

## Plantilla de evidencia por tarea

Registrar: criterio → escenario → comando rojo y fallo esperado → cambio mínimo →
comando verde → refactor/regresión → limitaciones. Para caracterización ya verde,
dejar constancia y no fabricar una fase roja.
