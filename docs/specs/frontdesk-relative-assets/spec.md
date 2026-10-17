# Estáticos de Frontdesk bajo /frontdesk/

## Spec

- Estado: done (corrección local validada; no desplegada).
- Aprobación: el usuario solicita «puedes modificar tu el archivo?» después de la
  propuesta de configurar `base: './'` y validar el build, sin modificar `/api`.
- Problema: el HTML compilado referencia `/assets/`; al abrir `/frontdesk/`, esas
  peticiones llegan a la web principal y sus JS/CSS pueden devolver 404.
- AC-01: los JS y CSS del HTML compilado se resuelven a archivos del propio build
  tanto desde `/` como desde `/frontdesk/`, sin escapar al directorio de montaje.
- AC-02: el cliente mantiene `/api` como base predeterminada; no se modifican
  autenticación, controles de acceso, Nginx ni el resto de aplicaciones.
- Restricción: acceder a `/frontdesk/` con barra final y configurar el proxy del
  host para quitar ese prefijo (`proxy_pass http://127.0.0.1:5174/`). No se garantiza
  soporte para rutas anidadas de un futuro router.
- No objetivos: desplegar, editar servidores, publicar puertos o cambiar dominios.

## Plan

1. Añadir una regresión sobre el resultado de un build real de Vite, sin escribir
   archivos, comprobando la resolución de JS/CSS desde ambas rutas.
2. Ejecutarla en rojo y confirmar que reproduce las referencias absolutas.
3. Añadir `base: './'` a `mana-forge-frontdesk/vite.config.ts` y repetir en verde.
4. Ejecutar la suite de Frontdesk, build, comprobaciones TypeScript y revisión de
   diff. Documentar el contrato de publicación y las limitaciones de validación.

## Tareas y evidencia

- [x] T-01 (AC-01): añadida `src/test/build-assets.test.ts`. Tras restaurar
  dependencias con `npm ci`, `npx vitest run src/test/build-assets.test.ts` falla
  porque `/assets/index-YcVbpofW.js` escapa de `/frontdesk/` (rojo esperado).
  El primer intento no pudo cargar Vite por dependencias locales incompletas;
  ese fallo de entorno no se considera la fase roja.
- [x] T-02 (AC-01): añadido `base: './'`; el mismo comando pasa (1 test).
- [x] T-03 (AC-01, AC-02): comprobaciones en Windows local:
  - `npx vitest run --maxWorkers=2 --testTimeout=15000`: 16 archivos, 88 tests
    correctos, incluidos regresión de build y contratos existentes del cliente API.
  - `npm run build`: correcto. El HTML generado referencia
    `./assets/index-ASyUUxkV.js` y `./assets/index-lV8mOdKO.css`.
  - `npx tsc --noEmit` y `npx tsc -p tsconfig.node.json --noEmit`: correctos.
  - `npm run lint`: no ejecutable; Frontdesk no define ese script. No se añade
    configuración de lint fuera del alcance.
  - `git diff --check`: correcto; Git avisa de conversión LF/CRLF en archivos
    existentes. README actualizado con requisitos de montaje y prueba de regresión.
  - No cambian API, autenticación ni Nginx; se conserva el cambio anterior de Compose.
- Validación de Debian/navegador y despliegue: pendientes; no se accede al servidor.
