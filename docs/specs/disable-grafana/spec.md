# Desactivar los envíos a Grafana

**Estado: implementado; validación con bloqueos previos.** El usuario ha pedido desactivar Grafana tras revisar el riesgo de privacidad de Faro y ha confirmado el alcance de los tres servicios, incluida la exportación OTLP genérica del motor. Las pruebas específicas pasan; la suite completa de la API tiene dos fallos reproducidos en el código original. El despliegue y el borrado de datos requieren autorización separada.

## Objetivo y alcance propuesto

Impedir que las integraciones de observabilidad incluidas en Mana Forge envíen nueva telemetría a Grafana: Faro en la web y los exportadores OTLP de la API y el motor. Como el motor también admite destinos OTLP genéricos, la propuesta desactiva su exportación OTLP integrada aunque el destino no sea Grafana. No se toca Google Analytics ni sus controles de consentimiento.

Esto supone perder los errores, trazas, métricas y logs exportados por estas integraciones. Se conservan el funcionamiento normal de la aplicación, la salida de logs habitual y los endpoints de salud existentes. No se presupone que los logs locales sean privados ni que no existan otros agentes de infraestructura.

## Estado comprobado

- `mana-forge-web/src/observability.ts` inicializa Faro si se suministra `VITE_FARO_URL`; el valor se incorpora al compilar la web. `jenkins/Jenkinsfile.web` no pasa explícitamente ese argumento, pero no se ha verificado el contenido de la imagen desplegada.
- `mana-forge-api/src/main/resources/application.yaml` controla trazas, métricas y logs OTLP con `GRAFANA_OTEL_ENABLED`, desactivado por defecto; un entorno puede activarlo.
- `mana-forge-engine/main.py` admite destinos Grafana y OTLP genéricos cuando `OTEL_SDK_DISABLED` lo permite. Su valor predeterminado es desactivado, pero un entorno puede activarlo.
- `docker-compose.yml` permite suministrar estas variables. Los Jenkinsfiles de API y motor recrean servicios usando un fichero Compose y credenciales del entorno; no se ha inspeccionado la configuración real del servidor.
- No se ha comprobado si las instalaciones desplegadas envían datos actualmente, ni si existen agentes, integraciones o recolectores adicionales fuera de este repositorio.

## Requisitos observables

- **AC-01:** La web construida desde este repositorio no inicializa Faro ni le envía datos aunque se suministre `VITE_FARO_URL` durante la compilación.
- **AC-02:** La API construida con la configuración normal del repositorio no exporta trazas, métricas ni logs OTLP a Grafana aunque existan los valores `GRAFANA_OTEL_ENABLED`, `GRAFANA_OTLP_ENDPOINT` y `GRAFANA_OTLP_AUTH`; conservar el endpoint de salud y logs locales. Verificar además las propiedades efectivas de Spring, ya que las propiedades de mayor prioridad o agentes externos pueden modificar el resultado.
- **AC-03:** El motor no inicializa el exportador OTLP integrado aunque se proporcionen `OTEL_SDK_DISABLED=false` y un destino Grafana o genérico; conservar API y salud normales. Esta decisión afecta a otros colectores OTLP, si existieran.
- **AC-04:** No cambiar los eventos GA4, la pantalla de consentimiento ni los controles de sesión, Turnstile, cuotas, caché y correo; no introducir secretos.
- **AC-05:** Ajustar documentación y textos de privacidad locales para reflejar el estado previsto tras un despliegue, sin afirmar que la instalación actual ya dejó de enviar datos ni que los datos anteriores fueron borrados. Informar de la pérdida de observabilidad remota.
- **AC-06:** Probar los tres servicios, incluyendo configuraciones que antes activaban la exportación, con destinos simulados o locales. Ninguna prueba envía datos a Grafana real; registrar resultados y limitaciones.

## Exclusiones y límites

La implementación en el repositorio no modifica por sí misma contenedores ya desplegados, imágenes antiguas, configuración de Jenkins/servidor o extensiones externas. Desplegar, cambiar credenciales o configuración del servidor, consultar datos reales o borrarlos requiere autorización independiente. La retención y eliminación de datos históricos en Grafana son decisiones separadas y potencialmente destructivas. No modificar por anticipado la documentación de servicios realmente desplegados sin explicar este límite.

## Aprobación

El usuario respondió «ok» tras presentarse expresamente el alcance de web, API y motor, la pérdida de exportación OTLP genérica del motor y de observabilidad remota. No autoriza el despliegue ni el borrado de datos.
