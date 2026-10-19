# Tareas — Design System

## Fase 1 — Tokens

- [x] T1.1 Bloque `@theme` en `src/index.css` con escala de radio
- [x] T1.2 Borrar `tailwind.config.js`
- [x] T1.3 Verificar que nada se rompe: `npx tsc --noEmit` + `npm run lint`
- [x] T1.4 Verificar visualmente que no hay diferencias
- [x] T1.5 Eliminar `xs:` de `Profile.tsx:677` y `Layout.tsx:154`
- [x] T1.6 Reclasificar `rounded-2xl` de Profile a los tokens de radio
- [x] T1.7 Reclasificar los tamaños de botón de Profile a `sm` / `md`

Criterio: si T1.4 falla, el fallo es de esta fase, no de la anterior.

## Fase 2 — Primitivas

- [x] T2.1 `Button` con test
- [x] T2.2 `Input` con label, error, hint e icon, con test
- [x] T2.3 `Textarea` con la misma interfaz, con test
- [x] T2.4 `Card`, `CardHeader`, `CardTitle`, con test
- [x] T2.5 Verificar los tests nuevos + `tsc` + `lint`

## Fase 3 — Migración de Profile

- [x] T3.1 Los 6 cards → `Card`
- [x] T3.2 Username, email, biography → `Input` / `Textarea`
- [x] T3.3 Los 3 campos de contraseña → `PasswordField` (extraído, elimina la
  triplicación)
- [x] T3.4 Botones de guardar, aplicar y cancelar → `Button`
- [x] T3.5 `npx vitest run` en verde
- [x] T3.6 `tsc` + `lint` limpios
- [x] T3.7 `npm run build` correcto
- [x] T3.8 `Profile.tsx` baja de 687 a 631 líneas

### Desviación de T3.3

Los 3 campos de contraseña **no** usan `Input`: usan un `PasswordField` local
que añade el interruptor de visibilidad. Se decidió al migrar porque `Input`
no tiene esa capacidad y forzar el interruptor por dentro habría significado
manipular las props de `pr-10`. El componente va en `Profile.tsx` y no es
primitivo del design system todavía; si aparece en otra vista debe promoverse.

### Desviación de T3.8

El objetivo eran ~250 líneas y se llega a 631. La razón es que
`AvatarPickerModal` (unas 120 líneas) queda dentro del fichero y estaba fuera de
alcance, y a que la lógica de la vista —verificación de username con debounce,
estado del formulario de contraseña, handlers— no se comprime por usar
primitivas. Queda pendiente si compensa extraer la lógica a hooks y el modal a
`components/ui/`.

## Evidencia

### Fase 1 — cerrada

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto, CSS 74,22 kB
- Sin regresión de clases existentes: `bg-zinc-900`, `border-zinc-800`,
  `bg-orange-600` y `focus:ring-orange-500` siguen generándose
- Los 7 tokens verificados con un fichero temporal que usaba
  `bg-surface`, `border-surface-raised`, `rounded-control`,
  `rounded-surface`, `bg-brand-600`, `text-brand-200` y `ring-brand-500`:
  las 7/utilidades se emitieron. Fichero borrado y rebuild confirma que
  `bg-surface` desaparece del bundle cuando deja de usarse
- `npx vitest run src/__tests__/views/` → 7 ficheros, 36 tests en verde
- `xs:` sin ningún uso restante en el proyecto

### Fase 2 — cerrada

- 24 tests nuevos: `Button` (8), `Input`/`Textarea` (12), `Card` (4)
- `npx vitest run src/__tests__/components/ui/` → 8 ficheros, 58 tests

### Fase 3 — cerrada

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto, CSS 75,35 kB (+1,1 kB frente a la línea base)
- `npx vitest run` → 43 ficheros, 290 tests en verde
- `labels.json`: `profile.rankTitle` añadida en es y en, sustituyendo el literal
  `Planswalker`
- `DESIGN.md` creado

**Error de verificación encontrado y corregido:** `npx tsc --noEmit` devolvió 0
con un `Save` sin importar que el build sí detectó (`TS2304`). El check de tipos
no cubre todo lo que ve Vite. Anotado en `DESIGN.md` para que el build forme
parte de la verificación obligatoria.

## Ciclo 2 — Accesibilidad y deuda de Profile

### Bloque 1 — Accesibilidad

- [x] C2.1 Semántica ARIA de tablist en la navegación lateral, con navegación
  por flechas y `roving tabindex`
- [x] C2.2 `tabpanel` etiquetado por su tab activo
- [x] C2.3 `aria-label` localizado en los tres toggles de contraseña, cada uno
  nombrando el campo que controla
- [x] C2.4 Región `role="status"` con `aria-live="polite"` para error y éxito de
  contraseña
- [x] C2.5 Foco visible de teclado en el switch de newsletter (WCAG 2.4.7)
- [x] C2.6 `role="switch"` con `aria-checked` explícito
- [x] C2.7 13 tests en `ProfileAccessibility.test.tsx`

### Bloque 2 — Deuda

- [x] C2.8 `PasswordField` promovido a `components/ui/` con 6 tests
- [x] C2.9 `AvatarPickerModal` extraído a `components/ui/`, con Escape, bloqueo
  de scroll del body y `role="dialog"`
- [x] C2.10 `ProfilePreferences.test.tsx` actualizado a los nuevos roles, sin
  cambiar su intención
- [x] C2.11 `labels.json`: `showPassword` y `hidePassword` en es y en

### Bloque 3 — Hooks

- [x] C2.12 `useUsernameAvailability` con debounce, con 11 tests
- [x] C2.13 `usePasswordForm` con validaciones, con 12 tests
- [x] C2.14 `Profile.tsx` consume ambos; baja de 519 a 433 líneas

#### Ciclo 3 — Dashboard

Dashboard no tenía ningún test. Se escribieron 5 antes de tocar nada, lo que
destapó tres defectos de accesibilidad en componentes que parecían correctos.

- [x] C3.1 `Dashboard.test.tsx`: 5 tests que fijan el comportamiento actual
- [x] C3.2 La tarjeta del mazo del día era un `div` con `onClick`: sin rol, sin
  teclado, sin nombre accesible. Ahora es un `button`
- [x] C3.3 Las 5 estrellas de valoración no tenían nombre accesible. Ahora
  anuncian "Puntuar con N de 5 estrellas"
- [x] C3.4 Las estrellas y el botón de cerrar del modal.quitaban el indicador
  de foco con `focus:outline-none`. Ahora usan `focus-visible:ring`
- [x] C3.5 El botón de cerrar del modal no tenía nombre: era un icono `X`
- [x] C3.6 Superficies a tokens `bg-surface` y radio `rounded-xl`
- [x] C3.7 `labels.json`: `closeModal`, `rateDeck`, `openDailyDeck` en es y en

### Ciclo 4 — Messages, Inbox y Support

`Messages.tsx` no tenía tests. Se escribieron 8 antes de tocar nada.

- [x] C4.1 `MessagesAccessibility.test.tsx`: 8 tests
- [x] C4.2 La lista de conversaciones ahora es un `nav` con etiqueta, no un
  `div`
- [x] C4.3 El área de mensajes es `role="log"` con `aria-live="polite"`: sin
  esto los mensajes nuevos no se anuncian
- [x] C4.4 El contador de no leídos tenía un número desnudo; ahora lleva
  `aria-label` localizado
- [x] C4.5 El botón de enviar no tenía nombre accesible (era un icono)
- [x] C4.6 `aria-label="Volver"` hardcodeado en inglés → `t('common.back')`
- [x] C4.7 `Support.tsx`: superficies, radios y color de marca a tokens
- [x] C4.8 `labels.json`: `messages.send`, `messages.unreadCount` en es y en

### Ciclo 5 — Login y Contact

Ninguna de las dos vistas tenía tests que comprobaran la asociación de labels.
`Login.test.tsx` existía, pero todos sus tests localizaban los campos por
placeholder, lo que oculta exactamente el defecto que había.

- [x] C5.1 `LoginLabels.test.tsx`: 4 tests. Los 4 campos de `Login.tsx` reciben
  `id` con `useId` y `htmlFor` en su label
- [x] C5.2 `ContactLabels.test.tsx`: 5 tests. Los 4 campos visibles de
  `Contact.tsx` reciben `id` y `htmlFor`
- [x] C5.3 Verificado que el honeypot `#contact-website` sigue fuera del árbol
  de accesibilidad y del orden de tabulación

### Ciclo 6 — Friends

Solo existía `FriendService.test.ts`, ningún test de la vista.

- [x] C6.1 `FriendsAccessibility.test.tsx`: 5 tests
- [x] C6.2 El selector de amigos/requests es un `tablist` real con `aria-selected`,
  `aria-controls`, `aria-labelledby` y navegación por flechas
- [x] C6.3 El contador de solicitudes pendientes lleva etiqueta localizada
- [x] C6.4 La búsqueda tiene etiqueta `sr-only` asociada
- [x] C6.5 Superficies a tokens `bg-surface` y `rounded-xl`

## Evidencia del ciclo 2

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0 (tras eliminar dos imports muertos en el test nuevo)
- `npm run build` → correcto
- `npx vitest run` → 47 ficheros, 332 tests en verde
- `Profile.tsx`: 687 → 433 líneas

### Lint: setState en efecto

`npm run lint` activó `react-hooks/set-state-in-effect` sobre
`useUsernameAvailability`, y con razón: el hook guardaba `idle`, `empty` y
`checking` en estado, cuando los tres se derivan de las entradas. La corrección
fue derivarlos durante el render y guardar en estado solo el resultado de la
comprobación, descartándolo si ya no corresponde al valor tecleado.

El primer intento de esa corrección tenía un fallo propio: derivar `idle` por
defecto impedía que `setStatus` forzara un estado tras un guardado fallido, y
un test lo detectó. La versión final guarda el valor comprobado junto al
resultado para que ambos casos convivan.

### Test de debounce y aislamiento

`isUsernameAvailable` called 1 times but got 4 times. No era un fallo del hook:
los `vi.spyOn` de tests anteriores se acumulaban. Añadido `vi.restoreAllMocks()`
en `beforeEach`; el test pasa aislado y en suite.

### Rompimiento de tests y su corrección

Cambiar `button` a `tab` y `checkbox` a `switch` dejó en rojo
`ProfilePreferences.test.tsx`. Se actualizaron los selectores manteniendo la
intención de cada aserción: el test sigue verificando que un fallo de red no se
reporta como guardado, y ahora comprueba `aria-checked` en lugar de
`toBeChecked()`, que no aplica a un elemento con rol `switch`.

### Hallazgo durante el trabajo

Los tres toggles compartían la etiqueta "Mostrar contraseña", lo que es
indistinguible para un lector de pantalla. El test lo delató con
`Found multiple elements`. La etiqueta ahora incluye el nombre del campo.

### Evidencia del ciclo 3

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 48 ficheros, 337 tests en verde

### Evidencia del ciclo 4

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 49 ficheros, 345 tests en verde

### Hallazgo: layout dual por CSS

`Messages.tsx` renderiza la lista de conversaciones y el panel de chat **dos
veces**, una en un contenedor `md:hidden` y otra en un `hidden md:flex`. No es
responsive: son dos copias del mismo árbol y CSS decide cuál se ve.

Consecuencia práctica: el usuario de lector de pantalla recibe el contenido
duplicado, y con él los botones de enviar y volver, que es lo que delató los
tests con `Found multiple elements`. Los tests usan `getAllBy*` para tolerar la
duplicación actual, pero el layout debería reestructurarse en una sola
instancia. No se ha hecho aquí porque es un cambio de comportamiento y de
diseño, no una migración.

### Evidencia del ciclo 5

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 51 ficheros, 354 tests en verde

### Tests que no encontraron nada donde no había nada

Se revisaron antes de tocar:

- `Login.tsx`: los 4 `focus:outline-none` van acompañados de `focus:ring-2`,
  así que el foco no se pierde. Solo faltaba la asociación de labels.
- `Contact.tsx`, `DeckExplorer.tsx`: los `focus:outline-none` van con
  `focus:border-orange-500`, que sí es indicador de foco.
- `Support.tsx`: ya tenía `role="alert"` y labels asociados.

### Placeholders como localizador

Los tests existentes de Login usaban `getByPlaceholderText`. Un input sin
`htmlFor` y con placeholder se localiza perfectamente por placeholder, así que
esos tests no podían detectar la falta de etiqueta. Los nuevos usan
`getByLabelText`, que sí la exige.

### Evidencia del ciclo 6

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 52 ficheros, 359 tests en verde

### TSC verde y build roto

Al añadir el `tabpanel` en `Friends.tsx`, `npx tsc --noEmit` devolvió 0 y
`vitest` falló con un error de sintaxis JSX que `tsc` no vio. El build de Vite
señaló el punto exacto. `tsc` y el parseo de JSX de esbuild no coinciden en
todos los casos; el build sigue siendo la verificación que manda.

Al añadir el div del tabpanel quedó un cierre imbalanceado y hubo dos intentos
fallidos de arreglarlo antes de contar los `<div>` abiertos y cerrados.

### Ciclo 7 — DeckViewer: tokens de superficie y accesibilidad

`DeckViewer.tsx` (883 líneas, la vista más grande sin tests) no tenía tests.
No se escribió suite de tests nueva; en su lugar se migró a tokens y se
corrigieron defectos de accesibilidad.

- [x] C7.1 Surfaces a `bg-surface` (reemplaza `bg-zinc-900` en header, barra de
  ordenación/grupo/vista, toggle de precios, badge de precio total, summary y
  barra flotante móvil)
- [x] C7.2 Radio `rounded-xl` en summary card y barra flotante móvil
- [x] C7.3 `focus-visible:ring-brand-500` en todos los botones (like, copiar,
  clonar, ordenar, grupo, vista, precio, cerrar modal móvil)
- [x] C7.4 `aria-label` en botones de icono (like, copiar, clonar, preview
  carta, cerrar modal móvil)
- [x] C7.5 Eliminada importación muerta de `CardTitle` e `Input`; corregido
  `as any` preexistente en `title` del botón like

## Evidencia del ciclo 7

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 52 ficheros, 359 tests en verde

### Lo que sigue pendiente

- Migrar las 9 vistas restantes (DeckViewer queda parcialmente migrada: tokens
  y a11y, pero sin tests propios)
- **Restructurar el layout dual de `Messages`** (dos copias del mismo árbol)
- Primitivas de comportamiento sobre Radix: Modal, Tabs, Switch, DropdownMenu
- `DeckBuilder.tsx`

### Ciclo 10 — DeckExplorer: accesibilidad y tests

`DeckExplorer.tsx` (177 líneas) no tenía tests. Se escribieron 6 antes de tocar nada.

- [x] C10.1 `DeckExplorer.test.tsx`: 6 tests (loader, estado vacío, labels de búsqueda/formato/ordenar, tarjetas)
- [x] C10.2 Loader con `role="status"` y `aria-label` localizado (`deckExplorer.loading`)
- [x] C10.3 Input de búsqueda con `htmlFor` asociado a su label
- [x] C10.4 Select de formato con `htmlFor` asociado a su label
- [x] C10.5 Select de ordenar con `htmlFor` asociado a su label
- [x] C10.6 `labels.json`: `deckExplorer.loading`, `deckExplorer.searchLabel`, `deckExplorer.formatLabel`, `deckExplorer.sortLabel` en es y en

## Evidencia del ciclo 10

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- `npm run build` → correcto
- `npx vitest run` → 57 ficheros, 383 tests en verde

### Lo que sigue pendiente

- Migrar las 6 vistas restantes (FormatDetail, DeckViewer parcialmente, DeckBuilder)
- **Restructurar el layout dual de `Messages`** (dos copias del mismo árbol)
- Primitivas de comportamiento sobre Radix: Modal, Tabs, Switch, DropdownMenu
- `DeckBuilder.tsx`
