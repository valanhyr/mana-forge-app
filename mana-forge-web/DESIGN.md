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
import PasswordField from '../components/ui/PasswordField';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';

<Button variant="primary|secondary|ghost|destructive" size="sm|md" loading>
<Input label="..." error="..." hint="..." icon={<User size={18} />} />
<Textarea label="..." error="..." hint="..." />
<PasswordField id label value visible toggleLabel onVisibleChange onChange />
<Card className="p-6"><CardTitle icon={<User size={20} />}>Título</CardTitle></Card>
```

`Input` y `Textarea` exigen `label` y generan el `id`/`htmlFor` solos: no se
pueden usar sin etiqueta accesible. `Button` es `type="button"` por defecto, así
que dentro de un `<form>` hay que pasar `type="submit"` explícitamente.
`PasswordField` recibe `toggleLabel` ya localizado, y el nombre del interruptor
debe incluir el nombre del campo: tres "Mostrar contraseña" idénticos son
indistinguibles para un lector de pantalla.

## Accesibilidad

Es criterio de aceptación, no un extra:

- Cada control tiene nombre accesible. Los interruptores de tipo icono llevan
  `aria-label` y, si hay varios iguales, el nombre del campo que afectan.
- Los mensajes de error y de éxito van en una región `role="status"`
  con `aria-live="polite"`.
- Un toggle debe tener foco visible de teclado (`peer-focus-visible:ring-*`).
  Nunca uses `peer-focus:outline-none` sin reemplazarlo.
- Si un conjunto de botones son en realidad pestañas: `role="tablist"`,
  `role="tab"` con `aria-selected` y `aria-controls`, `role="tabpanel"` con
  `aria-labelledby`, y navegación con flechas.
- Cambiar un rol ARIA rompe los tests existentes que lo buscaban por el rol
  anterior. Actualízalos y comprueba que mantienen su intención.

## Qué queda por migrar

Estas primitivas cubren solo parte del sistema. Antes de escribir un modal, un
tab o un switch a mano, mira `docs/specs/design-system/tasks.md`: la sección de
trabajo pendiente lista lo que ya está decidido para un ciclo posterior.

En concreto, no reimplementes:

- **Modales**: existe `components/ui/Modal.tsx`, pero aún le faltan Escape,
  bloqueo de scroll del `body` y `role="dialog"`. Está anotado para arreglar.
  `components/ui/AvatarPickerModal.tsx` ya hace las tres cosas y puede servir
  de referencia, aunque es específico del perfil.
- **Tabs**: la semántica ARIA de `tablist` está resuelta solo en Profile, no
  como primitiva.
- **Switches**: el foco visible de teclado ya está corregido en Profile, pero
  tampoco es primitiva.

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
### Comportamiento (Radix)

```tsx
import Modal from '../components/ui/Modal';
import Switch from '../components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/DropdownMenu';

<Modal isOpen onClose title="..." closeLabel="Cerrar" fullScreenMobile />
<Switch aria-label="..." checked onCheckedChange={...} />
```

Foco, Escape, ARIA y teclado los gestiona Radix. `Modal` recibe `closeLabel`
ya localizado. Los estilos de estado usan `data-[state=...]`.
