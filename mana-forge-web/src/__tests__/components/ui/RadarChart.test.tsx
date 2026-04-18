import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RadarChart from '../../../components/ui/RadarChart';

const BASE_AXES = [
  { key: 'speed', label: 'Speed', value: 7 },
  { key: 'consistency', label: 'Consistency', value: 8 },
  { key: 'aggression', label: 'Aggression', value: 5 },
  { key: 'resilience', label: 'Resilience', value: 6 },
  { key: 'interaction', label: 'Interaction', value: 4 },
  { key: 'combo', label: 'Combo', value: 3 },
];

describe('RadarChart', () => {
  it('renderiza el SVG con aria-label', () => {
    const { container } = render(<RadarChart axes={BASE_AXES} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Deck radar chart');
  });

  it('muestra las etiquetas de cada eje', () => {
    render(<RadarChart axes={BASE_AXES} />);
    BASE_AXES.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('muestra los valores de cada eje', () => {
    render(<RadarChart axes={BASE_AXES} />);
    // Each value appears as a standalone text node
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('no muestra polígono proyectado cuando no hay projectedValue', () => {
    const { container } = render(<RadarChart axes={BASE_AXES} />);
    // Only one filled polygon (orange) — no green stroke
    const polygons = container.querySelectorAll('polygon[stroke="#22c55e"]');
    expect(polygons).toHaveLength(0);
  });

  it('muestra el polígono proyectado cuando hay projectedValue', () => {
    const axesWithProjected = BASE_AXES.map((a) => ({ ...a, projectedValue: a.value + 1 }));
    const { container } = render(<RadarChart axes={axesWithProjected} />);
    const greenPoly = container.querySelector('polygon[stroke="#22c55e"]');
    expect(greenPoly).toBeInTheDocument();
  });

  it('muestra la leyenda cuando hay projectedValue', () => {
    const axesWithProjected = BASE_AXES.map((a) => ({ ...a, projectedValue: a.value + 1 }));
    render(<RadarChart axes={axesWithProjected} size={300} />);
    // Legend uses aria-hidden spans, check by looking for "→" in value labels
    const svgText = document.body.textContent ?? '';
    expect(svgText).toMatch(/→/);
  });

  it('acepta un tamaño personalizado', () => {
    const { container } = render(<RadarChart axes={BASE_AXES} size={320} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('320');
    expect(svg?.getAttribute('height')).toBe('320');
  });

  it('funciona sin errores con un solo eje', () => {
    expect(() =>
      render(<RadarChart axes={[{ key: 'speed', label: 'Speed', value: 5 }]} />)
    ).not.toThrow();
  });
});
