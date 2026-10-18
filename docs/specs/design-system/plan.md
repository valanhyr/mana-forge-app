# Plan de implementación — Design System

Ejecutar en orden. Cada fase se cierra con su verificación antes de pasar a la
siguiente.

## Fase 1 — Tokens

Toca: `src/index.css`, `tailwind.config.js` (borrar), `Profile.tsx`,
`Layout.tsx`.

1. Añadir bloque `@theme` en `src/index.css` con la escala de radio y los
   colores de marca. No redefinir los colores de Tailwind: se usan tal cual.
2. Borrar `tailwind.config.js`. Verificar con `npx tsc --noEmit` y
   `npm run lint` que nada se rompe y con inspección visual que no cambia nada.
3. Eliminar `xs:` de `Profile.tsx:677` y `Layout.tsx:154`. Reclasificar los
   `rounded-2xl` de Profile al radio correcto del token.
4. Reclasificar los tamaños de botón de Profile a `sm` y `md`.

Verificación: `npx tsc --noEmit`, `npm run lint`, y revisar Profile antes y
después.

Riesgo: si Tailwind 4 deja de resolver algo que antes resolvía, se verá como
pérdida de estilo en el navegador, no como error de compilación. Comprobar
`npm run dev` y una vista con cards, botones e inputs.

## Fase 2 — Primitivas

Toca: `src/components/ui/Button.tsx`, `Input.tsx`, `Textarea.tsx`,
`Card.tsx` y sus tests en `src/__tests__/components/ui/`.

1. `Button` — props `variant`, `size`, `loading`, `type`. Estados: default,
   hover, focus-visible, disabled, loading. El loading muestra spinner y
   bloquea el click.
2. `Input` — props `label`, `error`, `hint`, `icon`. Genera `id` y `htmlFor`
   internamente salvo que se pasen. Añade `aria-invalid` y `aria-describedby`
   cuando haya error o hint.
3. `Textarea` — misma interfaz que `Input`.
4. `Card`, `CardHeader`, `CardTitle`.

Verificación: tests nuevos en verde, `npx tsc --noEmit`, `npm run lint`.

Riesgo: `Input` con label obligatorio rompe todos los usos actuales que no
pasan label. Se asume que solo se usa en vistas migradas.

## Fase 3 — Migración de Profile

Toca: `src/views/profile/Profile.tsx`.

1. Card del avatar, card de navegación y los 4 cards de contenido → `Card`.
2. Username, email, biography y los 3 campos de contraseña → `Input` /
   `Textarea`. Esto resuelve `htmlFor` en los 6 campos de paso.
3. Botones de guardar, aplicar avatar y cancelar → `Button`.
4. `AvatarPickerModal` se deja intacto.

Verificación: `npx vitest run src/__tests__/views/`, `npx tsc --noEmit`,
`npm run lint`, e inspección visual comparando antes y después.

Riesgo: `handleSaveProfile` y `handleChangePassword` dependen de
`disabled` en los botones. `Button` debe propagar `disabled` y el estado
`loading` sin romper el `aria-*` de los inputs. El test de preferencias de
newsletter debe seguir en verde sin cambios: no toca estos componentes.

## Fuera de alcance

Los defectos de accesibilidad preexistentes en Profile y la migración de los
modales quedan anotados en `spec.md` para ciclos posteriores.