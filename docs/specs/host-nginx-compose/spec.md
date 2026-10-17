# Nginx de entrada gestionado por el servidor Linux

## Spec

- Estado: done (configuración local validada; no desplegado).
- Alcance aprobado: retirar únicamente el servicio `nginx` independiente de
  `docker-compose.yml`, según la confirmación «ok» del usuario tras la propuesta.
- Problema: el servidor Linux ya dispone de Nginx como proxy de entrada. El
  servicio adicional de Compose intenta publicar también el puerto 80 y monta
  una configuración de sitio con destinos loopback del host dentro del contenedor.
- AC-01: Compose no declara un servicio independiente `nginx` ni su publicación
  `80:80`.
- AC-02: el resto de servicios, puertos, redes y volúmenes mantiene su configuración,
  incluidos los Nginx internos de `web` y `frontdesk`.
- No objetivos: modificar el `nginx.conf` raíz o los Dockerfiles, cambiar HTTPS,
  cabeceras o controles de seguridad, desplegar o detener/eliminar contenedores.

## Plan

1. Eliminar el bloque del servicio `nginx` y aclarar los comentarios de `web`
   sobre el proxy del host y su publicación exclusiva en loopback.
2. Validar Compose con Frontdesk incluido y comparar la configuración restante
   con la versión anterior, sin cargar secretos ni arrancar servicios.
3. Revisar el diff y documentar evidencia y limitaciones.

## Tareas y evidencia

- [x] T-01 (AC-01): retirado el servicio `nginx`; comentarios de `web` aclarados.
- [x] T-02 (AC-02): comparación estructural contra `HEAD:docker-compose.yml`:
  los nueve servicios restantes conservan íntegramente su configuración, así como
  la red declarada y los volúmenes.
- [x] T-03 (AC-01, AC-02): validación con
  `docker compose --project-directory . --env-file NUL -f docker-compose.yml --profile frontdesk config --no-interpolate --format json`
  correcta. `git diff --check` correcto; Git avisa de la conversión local LF/CRLF.
- La primera comparación detectó también la desaparición de la red `default`
  generada automáticamente por Compose. Se comprobó que solo la usaba `nginx`;
  la comparación final pasa descontando ese efecto esperado y el servicio retirado.
- TDD: no aplicable al código de aplicación; es una corrección declarativa de
  configuración. Se valida con Docker Compose y comparación estructural, sin
  fabricar una prueba roja de lógica de negocio.
- Entorno: Windows local, Docker Compose v5.0.1. No se accede a los servidores.
- Despliegue: no realizado. Si `mana-forge-nginx` ya existe en un servidor,
  retirar su declaración no elimina el contenedor existente; su limpieza requiere
  una acción operativa separada y autorizada.
