# Desarrollo por especificaciones, planes y TDD

## Propósito

Trabajar con **SDD (spec-driven development)** para acordar qué construir y con
**TDD (test-driven development)** para comprobar cada cambio de comportamiento.
Este proceso es independiente de la herramienta o asistente utilizado.

Flujo: **explorar → spec → plan → aprobación → tareas → rojo / verde / refactor → validación**.

Los comandos y convenciones técnicas siguen en `.github/copilot-instructions.md` y
las decisiones de arquitectura en `ARCHITECTURE.md`. Verificar los comandos contra
el servicio real antes de documentarlos o ejecutarlos.

## Artefactos

Para funcionalidades, cambios de comportamiento entre servicios y correcciones no
triviales, crear una carpeta con nombre descriptivo en kebab-case:

```text
docs/specs/<feature>/
  spec.md
  plan.md
  tasks.md
```

No crear carpetas vacías ni documentos para trabajo no solicitado. Reutilizar una
spec existente si corresponde al mismo alcance y respetar cambios de otros autores.
Escribir los documentos en el idioma acordado con el usuario.

### `spec.md`: qué debe ocurrir

- Estado: `draft`, `approved`, `in-progress`, `done` o `blocked`.
- Problema, usuarios afectados y objetivo.
- Alcance y **no objetivos**.
- Comportamiento actual verificado y comportamiento esperado.
- Requisitos y criterios de aceptación identificados: `AC-01`, `AC-02`, etc.
- Escenarios observables, preferiblemente **Dado / Cuando / Entonces**.
- Errores, estados vacíos, permisos, privacidad y concurrencia cuando apliquen.
- Contratos públicos y reglas de compatibilidad o migración cuando apliquen.
- Restricciones, decisiones pendientes y referencias a arquitectura.
- Aprobación: alcance aprobado y referencia o resumen de la confirmación del usuario.

La spec describe comportamiento verificable, no una lista de archivos por modificar.
No convertir supuestos pendientes en requisitos aprobados.

### `plan.md`: cómo se implementará y verificará

- Estado y referencia a la spec.
- Diseño, servicios afectados y archivos principales verificados.
- Alternativas relevantes y motivo de la elección.
- Fases pequeñas, dependencias y orden de entrega.
- Estrategia de pruebas: unitarias, contratos, integración y recorridos según el riesgo.
- Compatibilidad, seguridad y recuperación de fallos.
- Validación manual cuando sea necesaria y entorno donde se ejecutará.
- Despliegue y migraciones **propuestos**, con las autorizaciones necesarias.
- Aprobación del usuario y fases incluidas.

### `tasks.md`: ejecución y evidencia

- Tareas `T-01`, `T-02`, etc., con casillas y dependencias.
- Cada tarea enlaza los criterios `AC-*` que satisface.
- Para cambios de comportamiento, registrar prueba roja, implementación mínima,
  prueba verde y refactorización si hace falta.
- Registrar comandos, resultados, entorno y validaciones manuales realizadas.
- Registrar bloqueos, pruebas no ejecutadas y autorizaciones pendientes.
- Resumen final de criterios cumplidos y riesgos o limitaciones restantes.

Ejemplo de seguimiento:

| Tarea | Criterio | Estado | Evidencia |
|---|---|---|---|
| T-01: definir contrato | AC-01 | Pendiente | — |
| T-02: probar y permitir respuesta autorizada | AC-01, AC-02 | Pendiente | Rojo y verde pendientes |
| T-03: validar recorrido entre clientes | AC-03 | Pendiente | Integración y revisión manual pendientes |

Marcar una tarea completada solo cuando tenga evidencia suficiente. No presentar
una prueba manual como automatizada ni una prueba con mocks como un envío real.

## Aprobación y control del alcance

1. Explorar código y documentación sin modificar comportamiento.
2. Redactar la spec y el plan; destacar supuestos y decisiones que bloqueen.
3. Pedir aprobación antes de implementar código de producción. Una sola confirmación
   puede aprobar ambos documentos si se han presentado claramente; puede limitarse
   a una fase.
4. Registrar la aprobación y ejecutar únicamente el alcance autorizado.
5. Si cambian criterios de aceptación, contratos, garantías de seguridad o alcance,
   actualizar los documentos y pedir aprobación del cambio material.

Cambios menores de implementación dentro del diseño aprobado no necesitan otra
aprobación, pero deben documentarse cuando afecten al plan.

Guardar un plan, revisar código o decir «podemos hacerlo» no equivale a autorizar su
implementación. Tampoco autoriza despliegues en producción, migraciones de datos,
correos reales o acciones destructivas. Confirmar esos efectos por separado.

## Ciclo TDD por tarea

1. **Rojo:** escribir una prueba del comportamiento esperado y ejecutarla. Confirmar
   que falla porque falta el comportamiento o reproduce el bug, no por una avería
   del entorno o un fallo ajeno.
2. **Verde:** implementar el cambio mínimo que haga pasar esa prueba; ejecutar las
   pruebas afectadas.
3. **Refactor:** mejorar estructura sin cambiar el contrato y volver a ejecutar las pruebas.
4. **Validación:** ejecutar regresiones del alcance, comprobaciones de tipos/lint
   disponibles y revisión manual cuando corresponda.
5. **Evidencia:** actualizar tareas y estado, indicando exactamente qué se ejecutó.

Las pruebas deben expresar requisitos, no copiar la implementación. Para bugs,
priorizar una prueba de regresión. No debilitar ni eliminar pruebas para hacerlas pasar.
Si una prueba ya pasa, no inventar una fase roja: investigar y explicar si el requisito
ya está cubierto o si el escenario elegido no reproduce el problema.

## Ruta ligera

Para una corrección pequeña y bien delimitada, se permite una spec, plan, tareas y
evidencia en **un solo archivo** `docs/specs/<feature>/spec.md`, con esas secciones.
Una petición explícita de corregir un bug concreto puede aprobar ese alcance ligero
si los criterios están claros; no extenderla a rediseños sin consultar.

Para documentación, formato o configuración sin un comportamiento automatizable,
no fabricar pruebas rojas. Indicar `TDD: no aplicable`, justificarlo y ejecutar una
validación adecuada: revisión de enlaces y contratos, validación de configuración,
build o comprobación manual según el cambio. No exigir aprobación adicional solo
para guardar documentación que el usuario ha solicitado explícitamente.

## Roadmaps existentes

`docs/communication-implementation-plan.md` es un roadmap propuesto. Al iniciar una
fase, extraer una spec delimitada y su plan, enlazarlos desde el roadmap y obtener
aprobación. No convertir todas las fases en trabajo autorizado por tener un documento.

Los cambios realizados antes de adoptar este proceso no deben registrarse como TDD
retroactivamente. Sus pruebas pueden servir como base de regresión, indicando su origen.

## Definición de terminado

- Criterios de aceptación del alcance aprobado satisfechos y vinculados a pruebas
  o validaciones justificadas.
- Pruebas y comprobaciones pertinentes ejecutadas, con resultados registrados.
- Documentación y contratos alineados; sin secretos ni efectos externos no autorizados.
- Limitaciones o fallos ajenos comunicados, no ocultos bajo un estado de completado.
- Spec, plan y tareas actualizados. Desplegado y terminado no son sinónimos: indicar
  por separado si el cambio está implementado, validado, desplegado o pendiente.
