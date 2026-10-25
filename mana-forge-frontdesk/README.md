# Mana Forge Frontdesk

Backoffice de Mana Forge: React, TypeScript y Vite. **Por defecto consulta la API real**
y requiere una sesión de operador verificado, activo y autorizado. Los mocks son una
opción explícita para demos y pruebas; una caída de la API nunca activa datos ficticios.

## Desarrollo

```powershell
npm ci
npm run dev
```

Vite escucha en `http://localhost:5174`. Validaciones disponibles:

```powershell
npm run build
npm test
npx vitest run src/test/build-assets.test.ts
npx tsc --noEmit
```

El proyecto todavía no tiene un script `lint`.

Vite reenvía `/api` a `http://localhost:8080`. Para otro origen público de la API, crear
`.env.local` a partir de `.env.example` y configurar `VITE_API_URL`. No almacenar
credenciales de MongoDB, Directus ni SMTP en ficheros `VITE_*` o en el frontend.

## Acceso y datos reales

- Frontdesk comprueba `/api/frontdesk/me` antes de montar vistas o consultar datos privados.
- Acceso: **email y contraseña** del operador (colección `frontdesk_operators`, no una
  cuenta de la web) y después el **código TOTP** de 6 dígitos. Si pierdes la aplicación de
  autenticación, usa uno de los códigos de recuperación (cada uno sirve una vez). No hay
  Google ni login de clientes. La contraseña y los códigos nunca se guardan en el
  navegador y se borran del formulario tras cada intento.
- **Primer acceso:** si el operador aún no tiene TOTP, Frontdesk muestra un código QR, la clave de
  configuración (también como enlace `otpauth://`) para añadirla a la aplicación de
  autenticación, y pide el primer código. Tras confirmarlo muestra **una sola vez** los 10
  códigos de recuperación; hay que guardarlos antes de continuar. Haz este paso justo
  después del despliegue: hasta entonces, quien conozca la contraseña podría enrolar su
  propio TOTP.
- Todos los fallos muestran el mismo mensaje genérico; tras 5 seguidos la cuenta se bloquea
  15 minutos. La sesión caduca a los 30 minutos de inactividad o a las 8 horas.- Las llamadas incluyen cookies de sesión y `Accept-Language` (locale `app_locale`).
  Antes de cada mutación se obtiene un token CSRF y se envía en `X-CSRF-TOKEN`.
- Si la sesión caduca o se revoca acceso, las vistas se desmontan y se vacía la caché
  privada. Los errores 401/403, de red o de servidor no se convierten en resultados mock.
  Se comprueba también al volver a la pestaña y cada minuto mientras está visible.
- Tickets, usuarios, auditoría e historial de correos tienen paginación de 25 registros.
  El detalle de un ticket carga su conversación desde `/tickets/{id}`, no desde el resumen.
- El operador de respuestas/asignaciones procede de la sesión; no se envía un nombre
  de autor inventado. Las notas internas no se envían por correo.
- La cuota de IA real es **diaria**. Fechas y estadísticas históricas desconocidas se
  muestran como «Sin registro», no como cero ni como fechas de 1970. El dashboard muestra
  conteos globales de tickets/usuarios, pero la métrica de cuota agotada se etiqueta
  explícitamente como muestra de los usuarios cargados en la página.
- Las plantillas proceden de Directus. Los valores de macros se rellenan explícitamente,
  sin URLs de baja, nombres ni IDs de tickets demo. Los correos individuales registran
  aceptación/fallo SMTP; no se asegura entrega al buzón ni se reintentan automáticamente.
- La pestaña Newsletter permite seleccionar suscritos verificados/activos, filtrarlos por
  plan o nombre/email y seleccionar todos los filtrados (hasta 100 por campaña). Incluye
  confirmación, enlace de baja y un historial de campañas para consultar tras recargar.
  No se reintentan ni reanudan envíos automáticamente; `RUNNING` tras un reinicio exige
  reconciliación. La auditoría se genera en el servidor, no en el navegador.

**Producción:** web, API y Frontdesk comparten origen (`https://mana-forge.com`, con
`/api` y `/frontdesk`), así que la cookie de operador (`SameSite=Strict`,
`Path=/api/frontdesk`) funciona sin CORS ni cookies de terceros. Compilar con
`FRONTDESK_API_URL=/api`.
## Docker Compose

Desde la raíz del monorepo, con la API y sus dependencias configuradas:

```powershell
docker compose up -d --build frontdesk
```

El servicio es optativo (`profiles: [frontdesk]`); nombrarlo explícitamente lo activa.
También se puede activar junto al resto mediante `docker compose --profile frontdesk up -d --build`.
No se ha publicado todavía una imagen en el registro: usar el build local.

Abrir `http://localhost:5174`. El puerto se publica **solo en 127.0.0.1** para no exponer
un backoffice mock por defecto. Si Vite está usando 5174, pararlo o añadir al `.env` raíz:

```dotenv
FRONTDESK_PORT=5175
FRONTDESK_URL=http://localhost:5175
```

Si cambias `FRONTDESK_URL`, recrea también el contenedor de la API. `FRONTDESK_IMAGE`
permite cambiar la etiqueta local/de despliegue. Las variables de operador, MongoDB,
Directus, SMTP y cifrado pertenecen **solo a la API**, nunca a este contenedor ni al bundle.
No se incluye ningún `.env` en el contexto de construcción.

Para Docker, el `.env` **raíz** proporciona los argumentos públicos de build:

```dotenv
FRONTDESK_API_URL=/api
FRONTDESK_USE_MOCKS=false
FRONTDESK_URL=http://localhost:5174
FRONTDESK_TOTP_KEY=CLAVE_BASE64_DE_32_BYTES
```

Las variables `FRONTDESK_API_URL` y
`FRONTDESK_USE_MOCKS` se compilan en el bundle: sus cambios requieren **reconstruir**
Frontdesk. `FRONTDESK_URL` y `FRONTDESK_TOTP_KEY` pertenecen a la API: sus cambios
requieren recrear ese contenedor.

Con la API ya arrancada y después de actualizar también su código:

```powershell
docker compose up -d --build --no-deps --force-recreate api
docker compose up -d --build --no-deps --force-recreate frontdesk
```

### Demo explícita

En `.env.local`, `VITE_USE_MOCKS=true`; para Docker, `FRONTDESK_USE_MOCKS=true` en el
`.env` raíz y reconstruir. La interfaz muestra **MOCK MODE** y ofrece «Reset Seeds».
No usar esa configuración para operaciones de producción. Los tests unitarios optan
por fixtures; los tests de integración HTTP usan adaptadores reales y `fetch` simulado.

## Imagen y nginx

El Dockerfile instala con `npm ci` sobre Node 24, compila Vite y copia únicamente `dist`
a nginx. El contenedor sirve HTTP en el puerto 80; TLS corresponde al proxy del host.

- `/`: aplicación, con fallback a `index.html` y sin caché del documento.
- `/assets/`: recursos con hash, con caché de un año; inexistentes devuelven 404.
- `/api/`: proxy a `api:8080` dentro de `mana-forge-network`, conservando la ruta,
  cookies y cabecera CSRF, y sin caché de respuestas API.
- `/healthz`: comprobación local de salud de nginx, **no** de la API.

Para un dominio real, el proxy HTTPS del host debe apuntar a `127.0.0.1:5174` (o al
puerto elegido), conservar `Host` y sobrescribir `X-Forwarded-Proto` con el protocolo
real. No se modifica el `nginx.conf` raíz, que pertenece al proxy existente.
La API protege los datos incluso si alguien descarga la interfaz. Antes de publicarla,
configurar el origen HTTPS, la lista de operadores, Directus y el login escogido.

El build usa `base: './'`: los JS/CSS se resuelven tanto desde `/` como desde
`/frontdesk/`. Para publicar bajo esa ruta, abrir siempre `/frontdesk/` con barra
final y configurar el Nginx del host con `location /frontdesk/` y
`proxy_pass http://127.0.0.1:5174/;` (barra final incluida), conservando las
cabeceras anteriores. Así se elimina el prefijo antes de llegar al contenedor.
Mantener `/api` apuntando a la API y no redirigir `/assets/` globalmente al
backoffice, porque pertenece también a la web principal. Esta configuración no
garantiza rutas anidadas de un futuro router. Cambiar la base requiere reconstruir
la imagen; recargar Nginx no modifica el HTML ya compilado.

El proxy descarta `CF-Connecting-IP`/`Forwarded` de entrada y sobrescribe `X-Forwarded-For`
con su peer: no permite evadir límites de IP inyectando cabeceras. Para distinguir IPs
finales detrás del ingress hará falta una configuración explícita de proxies de confianza;
la cuota autenticada sigue usando el ID de usuario, no la IP.

La imagen puede validarse en Linux sin utilizar los binarios nativos de `node_modules`
del host. Desde este directorio:

```powershell
docker build --target test -t mana-forge-frontdesk:test .
docker build -t mana-forge-frontdesk:local .
```

Un `docker run` aislado necesita que el hostname `api` sea resoluble. Compose proporciona
esa resolución y espera a que la API esté saludable.

Contratos y configuración del backend: [`../docs/frontdesk-api.md`](../docs/frontdesk-api.md).
