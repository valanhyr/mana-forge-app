# Design System — Mana Forge Web

Estado: aprobado para implementación del ciclo 1 (tokens + Button/Input/Card + migración de Profile).

## Contexto

`mana-forge-web` tiene 18 vistas, tres de ellas por encima de 700 líneas
(`DeckBuilder` 1753, `DeckViewer` 838, `Dashboard` 767). `src/components/ui/`
contiene 27 archivos que no forman un sistema: son primitivas sueltas que se
reimplementan dentro de las vistas. Medición del estado actual:

- 29 de 30 `<label>` sin `htmlFor`
- 33 copias del patrón card `bg-zinc-900 border-zinc-800`
- 6 variantes de tamaño de botón para la misma idea
  (`px-4 py-2` ×40, `px-6 py-3` ×9, `px-5 py-2` ×5, `px-8 py-3` ×2, `px-6 py-2` ×2, `px-5 py-3` ×2)
- dos colores de foco en uso: `orange` 15, `indigo` 3
- contenedores `max-w-4xl/5xl/6xl/7xl` sin regla
- `xs:` usado en 2 ficheros sin estar definido; esas clases no generan nada
- `tailwind.config.js` está en formato v3 y el proyecto usa Tailwind 4 sin
  `@config`, así que Tailwind nunca lo lee. Su `theme.extend.colors.mana`
  no se aplica y no tiene ningún uso en el código

## Objetivo

Una capa de tokens y primitivas sobre la que las vistas se construyan, de modo
que cambiar el color de foco o la escala de radio sea un cambio en un fichero y
no en 33.

## No objetivos

- Rediseño visual. La paridad visual es el criterio de aceptación de cada
  migración.
- Migrar `DeckBuilder.tsx` en este ciclo.
- Sustituir Tailwind por CSS-in-JS.
- Resolver el botón "Eliminar cuenta" de `Profile.tsx`: requiere una decisión de
  producto, no es un problema de design system.

## Decisiones

| Decisión | Motivo |
|---|---|
| Tokens en bloque `@theme` de Tailwind 4 | Formato nativo; elimina el `.js` huérfano |
| Colores `mana.*` se eliminan | Cero usos verificados en `src/` |
| `xs:` se elimina | Nadie lo pidió y el layout funciona con `sm:` |
| `Button`, `Input`, `Textarea`, `Card` a mano | Son markup sobre tokens; una dependencia no aporta nada aquí |
| Radix se reserva para Modal, Tabs, Switch, DropdownMenu | Escape, foco atrapado y scroll lock son donde fallan las implementaciones caseras |

Radix queda **documentado pero no materializado** en este ciclo. Los modales
actuales ya fallan en Escape, pero migrarlos aquí mezclaría un cambio de
comportamiento con uno de estructura y anularía el valor de validar el sistema
contra una pantalla real.

## Alcance del ciclo 1

1. Tokens, sin cambios de markup
2. `Button`, `Input`/`Textarea`, `Card`
3. `Profile.tsx` migrada como prueba

## Fuera de alcance, anotado para ciclos posteriores

Accesibilidad preexistente en `Profile.tsx` que **no** se arregla aquí porque no
depende del design system:

- roles ARIA de tablist en la navegación lateral
- `aria-label` en los tres toggles de mostrar/ocultar contraseña
- `aria-live` en los mensajes de error y éxito de contraseña
- `peer-focus:outline-none` en el switch de newsletter (WCAG 2.4.7)

La única excepción es `htmlFor`, que queda resuelto sin coste al usar el nuevo
`Input`.

También fuera de alcance: `AvatarPickerModal` mantiene su implementación propia.

## Fase 1 — Tokens

Sin cambios de markup. Si algo se ve distinto, es un bug de esta fase.

1. Migrar `tailwind.config.js` a un bloque `@theme` en `src/index.css` y borrar
   el archivo.
2. Escala de radio: `rounded-lg` para inputs y botones, `rounded-xl` para cards
   y modales, `rounded-full` para pills y avatares. Reclasificar los 51
   `rounded-2xl` existentes.
3. Altura de botón: dos tamaños, `sm` y `md`. Elimina las 6 variantes.
4. Foco: un único color para los anillos. Naranja, por ser el color de marca y
   por dominar 15 de 18 usos. Indigo queda como acento semántico de seguridad,
   nunca como color de foco.
5. Eliminar `xs:` de `Profile.tsx` y `Layout.tsx`.
6. Documentar las alturas de contenedor con una regla.

**Aceptación:** `npx tsc --noEmit` y `npm run lint` limpios, e inspección visual
sin diferencias.

## Fase 2 — Primitivas

1. `Button` — `variant`: primary / secondary / ghost / destructive;
   `size`: sm / md; `loading`
2. `Input` / `Textarea` — label, error y hint integrados; `htmlFor` obligatorio
   por props
3. `Card` con `CardHeader` y `CardTitle`

Cada primitiva con su test.

**Aceptación:** tests propios en verde y `npx tsc --noEmit` limpio.

## Fase 3 — Migración de Profile

Criterio de validación del sistema: si la migración sale limpia, el sistema
sirve; si no, hay que corregir tokens antes de migrar nadie más.

`Profile.tsx` pasa de 687 a unas 250 líneas.

**Aceptación:** paridad visual, `npx vitest run src/__tests__/views/` en verde y
`npx tsc --noEmit` limpio.

## Fases posteriores

- Migración del resto de vistas, una por PR, empezando por `Dashboard`,
  `Messages` y `DeckViewer`.
- Primitivas de comportamiento sobre Radix: Modal (arreglando el existente),
  Tabs, Switch, DropdownMenu.
- `DeckBuilder.tsx` (1753 líneas) al final.

## Riesgos

- **La Fase 1 no tiene impacto visible.** Es deliberado: solo hace posible la
  Fase 2 sin improvisar.
- **El beneficio real aparece en la migración.** Un sistema sin migración solo
  añade una capa más encima del problema.
- **Radix añadirá ~15 kB gz** cuando se adopte. Se mitiga importando solo los
  módulos usados.