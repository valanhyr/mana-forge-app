import { describe, it, expect } from 'vitest';
import { API_BASE_URL } from '../config';

describe('config', () => {
  it('exports API_BASE_URL', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('API_BASE_URL es válida', () => {
    expect(API_BASE_URL.length).toBeGreaterThan(0);
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
  });
});
