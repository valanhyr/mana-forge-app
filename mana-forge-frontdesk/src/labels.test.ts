import { expect, it } from 'vitest';
import labels from './labels.json';

it('provides each new frontdesk label in both supported locales', () => {
  expect(Object.keys(labels.es).sort()).toEqual(Object.keys(labels.en).sort());
});
