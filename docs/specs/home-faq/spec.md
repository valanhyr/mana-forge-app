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
