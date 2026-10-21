import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import Switch from '../../../components/ui/Switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/DropdownMenu';

describe('Tabs', () => {
  it('muestra el panel de la pestaña seleccionada y cambia al pulsar otra', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="secciones">
          <TabsTrigger value="a">Uno</TabsTrigger>
          <TabsTrigger value="b">Dos</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole('tab', { name: 'Uno' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Dos' }));
    expect(screen.getByText('Panel B')).toBeInTheDocument();
    expect(screen.queryByText('Panel A')).not.toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('es un role=switch y notifica el cambio', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch aria-label="notificaciones" onCheckedChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'notificaciones' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('no cambia si está deshabilitado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch aria-label="x" disabled onCheckedChange={onChange} />);
    await user.click(screen.getByRole('switch', { name: 'x' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DropdownMenu', () => {
  it('abre el menú y ejecuta la acción del item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Opciones</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Editar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Opciones' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
