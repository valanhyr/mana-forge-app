# Preguntas frecuentes en inicio

Estado: implementado; validación visual manual pendiente.

## Objetivo y alcance

Ofrecer preguntas frecuentes en la página de inicio, como último bloque de contenido antes del footer. El footer pertenece al layout común. El contenido proviene inicialmente de un JSON local en español e inglés.

## Criterios de aceptación

- **AC-01:** Las FAQ aparecen únicamente en inicio, después del resto de sus secciones. Si no hay preguntas para el idioma activo, no se muestra la sección ni deja espacio vacío.
- **AC-02:** Las preguntas se presentan como acordeón accesible; se puede abrir y cerrar una pregunta con ratón o teclado, solo una está abierta a la vez y su título se resalta en naranja.
- **AC-03:** Los temas con preguntas se agrupan en pestañas accesibles subrayadas si hay más de uno; con un único tema no se muestran pestañas. Al cambiar de tema no queda abierta una pregunta de otro tema.
- **AC-04:** El título de sección y la etiqueta accesible de pestañas usan las traducciones de la interfaz. Las preguntas y temas se obtienen para el idioma activo y reaccionan a sus cambios.
- **AC-05:** El JSON permite identificar temas y preguntas mediante IDs estables, y la presentación recibe datos independientes de su origen. No se conecta el CMS.
- **AC-06:** La interfaz se adapta a móvil y mantiene foco visible y navegación por teclado.
- **AC-07 (fase inicial):** Se mostraron tres preguntas de ejemplo bilingües en al menos dos temas. Esta fase queda sustituida por AC-08.
- **AC-08:** Sustituir los ejemplos por preguntas prácticas, verificadas contra los flujos existentes, en español e inglés y agrupadas por temas: uso general, análisis con IA, mazos y cuenta/comunidad. Mantener la correspondencia de IDs entre idiomas y no prometer capacidades o garantías no comprobadas.

## Exclusiones y decisiones

Sin integración con CMS, cambios de comportamiento de backend ni despliegue. Las respuestas son texto plano en esta fase. Los grupos sin preguntas no se muestran. Si un tema seleccionado no existe al cambiar de idioma, se selecciona el primero disponible.

El JSON `mana-forge-web/src/data/faqs.json` contiene una lista por idioma. Ejemplo de estructura:

```json
{
  "es": [{ "id": "tema", "title": "Tema", "questions": [{ "id": "pregunta", "question": "Pregunta", "answer": "Respuesta" }] }],
  "en": [{ "id": "tema", "title": "Topic", "questions": [{ "id": "pregunta", "question": "Question", "answer": "Answer" }] }]
}
```

Los IDs de temas deben ser únicos por idioma y los de preguntas, únicos dentro de cada tema. Mantener los mismos IDs entre traducciones permite conservar el tema seleccionado al cambiar de idioma.

## Aprobación

El usuario confirmó la ubicación solo en inicio, ocultar la sección vacía y aprobó la propuesta y el plan en la conversación con «ok». Posteriormente solicitó «ponme 3 de ejemplo», y después pidió analizar la operativa y sustituirlos por preguntas reales extraídas del proyecto.

## Extensión propuesta: contenido desde Directus

**Estado: implementada; validación real de Directus y regresión completa de API pendientes.** El usuario aprobó la extensión y su plan en conversación al solicitar «crea una rama para ello y adelante». Esta extensión sustituye únicamente las partes del alcance inicial que establecen JSON local como fuente y excluyen el CMS; se conservan las reglas de presentación y accesibilidad anteriores. La aprobación no incluye migraciones, cambios en la instancia ni despliegue.

### Objetivo y alcance

Gestionar las pestañas, las preguntas, su orden y sus traducciones en Directus; servirlas mediante la API Spring y mostrarlas en inicio. El usuario está creando el contenido en Directus. No crear ni modificar colecciones, permisos o contenido en una instancia real, ni desplegar o migrar datos como parte de esta autorización.

Estado actual comprobado: `FaqService` importa `mana-forge-web/src/data/faqs.json` de forma síncrona; `Dashboard` entrega ese contenido a `FaqSection`. El componente filtra temas vacíos, muestra un tema sin barra de pestañas y solo existe en inicio. La API aún no dispone de un endpoint de FAQ. `api.ts` asigna `Accept-Language` desde `localStorage`, con `es` como valor por defecto, mientras que `LanguageContext` puede elegir `en` por el navegador sin guardarlo inicialmente.

### Contrato editorial propuesto

- `faq_topics`: `id` interno, `code` estable único, `status`, `sort` y `translations` con `title` y el idioma.
- `faqs`: `id` interno, `code` estable único, `status`, `sort`, relación `topic` con `faq_topics`, y `translations` con `question`, `answer` y el idioma.
- Reutilizar la colección `languages` existente y su clave de idioma; comprobar los nombres y tipos reales, incluidas las relaciones de traducción y sus permisos, antes de integrar. Este diseño no certifica el esquema de la instancia del usuario.
- `status = published` identifica contenido público. Los códigos no se traducen; las respuestas son texto plano. Debe existir como máximo una traducción por elemento e idioma. El orden numérico es ascendente y, en empate, `code` es el desempate estable. `faqs.sort` se aplica dentro de cada tema.
- Omitir entradas publicadas con código vacío y todas las entradas cuyo código esté duplicado en su colección; registrar el problema sin exponer contenido ni credenciales. Considerar la unicidad por colección, no entre temas y preguntas. Los valores `sort` nulos se ordenan al final y se desempata por `code`. No inferir que la instancia impone unicidad.

Para mostrar contenido, tanto el tema como la FAQ deben tener `status = published`, la FAQ debe estar relacionada mediante `topic` y ambos necesitan una traducción completa para el idioma activo. El token de la API debe poder leer `faq_topics`, `faqs` y sus traducciones y campos relacionados, incluidos `languages_code`; no es necesario exponer el token al navegador. Los permisos reales y nombres de relaciones deben verificarse en la instancia: las pruebas actuales usan Directus simulado.

### Criterios de aceptación de la extensión

- **CMS-AC-01:** `GET /api/v1/content/faqs` es público y devuelve una lista de objetos `{id, title, questions: [{id, question, answer}]}`, donde los `id` son los códigos estables, no los ID internos de Directus. Una lista vacía válida devuelve `200 []`.
- **CMS-AC-02:** La API solo entrega temas y preguntas publicados con traducción completa para el idioma solicitado: título no vacío para el tema y pregunta y respuesta no vacías para cada FAQ. No mezcla idiomas ni usa el JSON local como respaldo. Omite los temas que queden sin preguntas visibles.
- **CMS-AC-03:** Los temas se ordenan por `sort`, luego `code`; dentro de cada tema, las FAQ se ordenan por su propio `sort`, luego `code`. La implementación debe obtener todos los elementos necesarios sin truncarlos silenciosamente por la paginación o límites de Directus.
- **CMS-AC-04:** La web solicita el contenido para el idioma activo (`es` o `en`) y, al cambiarlo, no muestra resultados obsoletos de otra petición o idioma. La primera visita con idioma inglés detectado debe obtener contenido inglés aunque `app_locale` no exista.
- **CMS-AC-05:** Durante la carga y ante un fallo de la API o de Directus, la sección se oculta sin mensajes de error visibles ni respaldo del JSON. El resto de inicio sigue funcionando. Una respuesta vacía válida se distingue de un fallo en la API; los errores no se presentan al cliente como éxito ni exponen tokens o trazas internas.
- **CMS-AC-06:** Cuatro temas con una única pregunta visible en el primero producen un único tema visible y, por comportamiento existente, se muestran sus preguntas sin barra de pestañas. Si ningún tema tiene preguntas visibles, no aparece la sección. Con más de un tema se conservan pestañas, acordeón y navegación accesibles.
- **CMS-AC-07:** Los códigos se conservan entre idiomas y cambios de texto para futura analítica; no se añade envío de eventos ni se modifica el consentimiento en esta extensión.
- **CMS-AC-08:** La selección del tema se conserva al cambiar de idioma si sigue disponible; si no está disponible, se selecciona el primero. Las respuestas tardías no restauran contenido de un idioma anterior.
- **CMS-AC-09:** No usar caché para esta primera integración: cada solicitud a la API consulta Directus y un fallo de origen no se oculta sirviendo una copia anterior. Así los cambios publicados se reflejan en la siguiente petición, a cambio de más llamadas al CMS.

### Idioma y errores propuestos

La web enviará el idioma activo explícitamente como `locale=es|en`. La API dará prioridad a ese parámetro y, si falta, resolverá `Accept-Language`; sin idioma compatible, usará `es`. Esto evita depender exclusivamente del interceptor actual sin modificar su comportamiento global. Se admitirán variantes regionales habituales (`es-ES`, `en-US`) en la cabecera. La semántica exacta de negociación se probará en la implementación.

Un fallo de red, permisos, respuesta inválida o indisponibilidad de Directus debe provocar un error de API seguro, no `200 []`. Una lista realmente vacía sí es una respuesta válida. El cliente oculta la sección en ambos casos, pero no bloquea la página.

### Exclusiones y aprobación

Sin eventos GA, Klaro, HTML enriquecido, migración automática del JSON, cambios de permisos en Directus ni despliegue. El JSON puede conservarse como referencia editorial, pero no será fuente ni respaldo en ejecución.

Decisiones confirmadas en conversación: ocultar temas sin preguntas y ocultar la sección cuando Directus falla, sin respaldo JSON. La aprobación de esta extensión incluye ocultar traducciones incompletas y no usar caché inicialmente. El usuario confirmó que las colecciones y campos coinciden con la propuesta y eligió omitir códigos vacíos o duplicados y poner al final las entradas sin orden. La comprobación de relaciones y permisos en una instancia real sigue pendiente.
