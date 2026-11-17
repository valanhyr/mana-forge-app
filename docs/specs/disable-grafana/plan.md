# Plan: desactivar Grafana

**Estado: implementado; validación con bloqueos previos.** Referencia: `spec.md`. El usuario aceptó desactivar los tres servicios, incluido el OTLP genérico del motor; el despliegue requiere autorización separada.

## Propuesta técnica

1. Web: desactivar el arranque de Faro en el código de la aplicación y evitar la activación accidental mediante las variables de compilación habituales. Escribir primero una prueba que suministre una URL y compruebe que no se inicializa; conservar Google Analytics sin cambios.
2. API: retirar o desactivar las integraciones exportadoras OTLP controladas por el repositorio y su configuración de Grafana, sin eliminar Actuator ni alterar la salida local de logs. Cubrir la configuración activa anterior con pruebas de contexto y verificar que no hay exportadores registrados ni llamadas a un destino simulado. No atribuir a los cambios control sobre posibles agentes externos o propiedades de prioridad superior.
3. Motor: impedir el arranque de su exportador OTLP integrado, tanto con destino Grafana como con destino genérico. Añadir prueba que establezca explícitamente las variables que antes lo activaban; mantener el endpoint de salud y la API.
4. Alinear `docker-compose.yml`, los argumentos de construcción y la documentación viva en la medida necesaria para que no se sugiera que Grafana sigue activo. Actualizar con cuidado los textos de privacidad y los cambios de analítica existentes; aclarar que describen el estado previsto del código y no verifican el estado de producción. No tocar los roadmaps históricos como si fueran documentación actual.
5. Ejecutar Vitest focalizado, lint, tipado y build web; `mvnw` para la API; pruebas del motor con su entorno Python. Documentar rojo/verde, comandos, avisos y bloqueos en `tasks.md`. Usar mocks o endpoints locales sin datos reales.

## Condiciones para el despliegue

Confirmación adicional del usuario; revisar por separado las imágenes/variables realmente usadas, los agentes externos, la ausencia de solicitudes al colector y los endpoints de salud después del despliegue. Los tres servicios tienen ciclos de release independientes. No cambiar o borrar datos históricos ni credenciales como parte de esta fase.

## Aprobación

El usuario respondió «ok» tras presentarse la spec y el plan, incluida la desactivación de OTLP genérico del motor. El despliegue y el tratamiento de datos históricos no están autorizados.
