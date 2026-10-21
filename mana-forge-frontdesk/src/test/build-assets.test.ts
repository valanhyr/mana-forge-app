// @vitest-environment node
import { expect, it } from 'vitest';
import { build } from 'vite';

it('resolves built JS and CSS inside the mount at / and /frontdesk/', async () => {
  const result = await build({ logLevel: 'silent', build: { write: false } });
  if (Array.isArray(result) || !('output' in result)) {
    throw new Error('Expected a single application build');
  }

  const html = result.output.find(file => file.fileName === 'index.html');
  if (!html || html.type !== 'asset') throw new Error('Missing built index.html');

  const assets = [...String(html.source).matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)]
    .map(match => match[1]);
  expect(assets.some(asset => asset.endsWith('.js'))).toBe(true);
  expect(assets.some(asset => asset.endsWith('.css'))).toBe(true);

  const outputFiles = result.output.map(file => file.fileName);
  for (const mount of ['/', '/frontdesk/']) {
    for (const asset of assets) {
      const url = new URL(asset, `https://frontdesk.test${mount}`);
      expect(url.pathname, `Asset ${asset} must stay inside ${mount}`)
        .toMatch(new RegExp(`^${mount}assets/`));
      // The host proxy strips the mount prefix before forwarding to the container.
      expect(outputFiles).toContain(url.pathname.slice(mount.length));
    }
  }
}, 30000);
