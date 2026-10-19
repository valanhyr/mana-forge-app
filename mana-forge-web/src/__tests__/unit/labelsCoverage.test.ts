import { describe, it, expect } from 'vitest';
import labels from '../../labels.json';

const sources = import.meta.glob(['/src/**/*.ts', '/src/**/*.tsx', '!/src/__tests__/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const KEY_PATTERN = /\bt\(\s*['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"]/g;

const resolve = (locale: 'es' | 'en', key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      (labels as Record<string, unknown>)[locale]
    );

const usedKeys = (() => {
  const found = new Map<string, string>();
  for (const [file, text] of Object.entries(sources)) {
    for (const match of text.matchAll(KEY_PATTERN)) {
      if (!found.has(match[1])) found.set(match[1], file);
    }
  }
  return found;
})();

describe('labels.json cubre todas las claves usadas con t()', () => {
  it('encuentra claves en el código', () => {
    expect(usedKeys.size).toBeGreaterThan(100);
  });

  for (const locale of ['es', 'en'] as const) {
    it(`todas las claves existen y son texto en "${locale}"`, () => {
      const missing = [...usedKeys.entries()]
        .filter(([key]) => typeof resolve(locale, key) !== 'string')
        .map(([key, file]) => `${key}  (${file})`);
      expect(missing).toEqual([]);
    });
  }
});
