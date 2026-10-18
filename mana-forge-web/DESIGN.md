# Design System — Mana Forge Web

Referencia rápida para construir vistas. El razonamiento y el alcance están en
`docs/specs/design-system/`.

## Tokens

Viven en el bloque `@theme` de `src/index.css`. No inventes valores nuevos: si
falta uno, añádelo ahí, no en la vista.

| Uso | Clase | Valor |
|---|---|---|
| Fondo de página | `bg-zinc-950` | |
| Superficie (cards) | `bg-surface` | zinc-900 |
| Superficie elevada | `bg-surface-raised` | zinc-800 |
| Superficie hundida (inputs) | `bg-surface-sunken` | zinc-950 |
| Borde | `border-zinc-800` | |
| Foco (un solo color) | `ring-brand-500` / `border-brand-500` | naranja de marca |
| Acento de seguridad | `indigo-500` | nunca como foco |

Radio: `rounded-control` (inputs, botones), `rounded-xl` (cards, modales),
`rounded-full` (pills, avatares). Nada más.

Botones: solo dos alturas, `size="sm"` (`px-4 py-2`) y `size="md"`
(`px-6 py-2.5`). No escribas `px-* py-*` a mano en un botón.

Contenedores: `max-w-4xl` para contenido de lectura, `max-w-6xl` para listados
con tabla o rejilla densa, `max-w-7xl` solo para vistas tipo explorador.

## Primitivas

Usa estas en vistas nuevas. No reimplementes el marcado.

```tsx
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';

<Button variant="primary|secondary|ghost|destructive" size="sm|md" loading>
<Input label="..." error="..." hint="..." icon={<User size={18} />} />
<Textarea label="..." error="..." hint="..." />
<Card className="p-6"><CardTitle icon={<User size={20} />}>Título</CardTitle></Card>
```

`Input` y `Textarea` exigen `label` y generan el `id`/`htmlFor` solos: no se
pueden usar sin etiqueta accesible. `Button` es `type="button"` por defecto, así
que dentro de un `<form>` hay que pasar `type="submit"` explícitamente.

## Qué queda por migrar

Estas primitivas cubren solo parte del sistema. Antes de escribir un modal, un
tab o un switch a mano, mira `docs/specs/design-system/tasks.md`: la sección de
trabajo pendiente lista lo que ya está decidido para un ciclo posterior.

En concreto, no reimplementes:

- **Modales**: ya existe `components/ui/Modal.tsx`, aunque le faltan Escape,
  bloqueo de scroll del `body` y `role="dialog"`. Está anotado para arreglar.
  `AvatarPickerModal` en `Profile.tsx` es un caso conocido.
- **Tabs**: falta la semántica ARIA de `tablist`.
- **Switches**: el foco visible de teclado está mal (WCAG 2.4.7).

## Reglas

- Cadenas en `labels.json`, ambos locales. Nada hardcodeado en la vista.
- Si un componente se repite tres veces, es una primitiva nueva.
- Radix se adopta en el ciclo de primitivas de comportamiento (Modal, Tabs,
  Switch, DropdownMenu). Para las que ya existen, no añadas la dependencia.

## Verificación

```bash
npx vitest run      # suite completa
npm run lint
npx tsc --noEmit
npm run build       # tsc no detecta todo lo que ve vite
```

`npx tsc --noEmit` dio 0 con un `Save` sin importar que el build sí detectó.
Ejecuta el build antes de dar por buena una migración.