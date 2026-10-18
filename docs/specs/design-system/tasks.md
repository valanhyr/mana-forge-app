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

## Evidencia del ciclo 2

- `npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0 (tras eliminar dos imports muertos en el test nuevo)
- `npm run build` → correcto
- `npx vitest run` → 45 ficheros, 309 tests en verde
- `Profile.tsx`: 687 → 519 líneas

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

### Lo que sigue pendiente

- Extraer la lógica de la vista a hooks (`useUsernameAvailability`,
  `usePasswordForm`). Las 519 líneas restantes son casi toda lógica, no marcado.
- Migrar las 15 vistas restantes
- Primitivas de comportamiento sobre Radix: Modal, Tabs, Switch, DropdownMenu
- `DeckBuilder.tsx`