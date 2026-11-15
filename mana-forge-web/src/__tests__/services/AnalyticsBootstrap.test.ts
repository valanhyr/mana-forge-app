import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';

describe('analytics bootstrap', () => {
  it('does not load or configure Google in the HTML before consent', () => {
    expect(html).not.toContain('googletagmanager.com/gtag/js');
    expect(html).not.toMatch(/gtag\s*\(\s*['"]config['"]/);
  });
});
