import { afterEach, describe, expect, it, vi } from 'vitest';

const initializeFaro = vi.fn();
const getWebInstrumentations = vi.fn(() => []);
const TracingInstrumentation = vi.fn(function (this: any) {
  this.name = 'tracing';
});

vi.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro,
  getWebInstrumentations,
}));

vi.mock('@grafana/faro-web-tracing', () => ({
  TracingInstrumentation,
}));

describe('observability bootstrap', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    initializeFaro.mockClear();
    getWebInstrumentations.mockClear();
    TracingInstrumentation.mockClear();
  });

  it('does not initialize Faro when VITE_FARO_URL is missing', async () => {
    vi.stubEnv('VITE_FARO_URL', '');
    vi.stubEnv('VITE_FARO_APP_NAME', 'mana-forge-web');
    vi.stubEnv('MODE', 'test');

    await import('../observability');

    expect(initializeFaro).not.toHaveBeenCalled();
  });

  it('initializes Faro when VITE_FARO_URL is present', async () => {
    vi.stubEnv('VITE_FARO_URL', 'https://collector.example/collect/app');
    vi.stubEnv('VITE_FARO_APP_NAME', 'mana-forge-web');
    vi.stubEnv('MODE', 'production');

    await import('../observability');

    expect(getWebInstrumentations).toHaveBeenCalledWith({ captureConsole: true });
    expect(TracingInstrumentation).toHaveBeenCalled();
    expect(initializeFaro).toHaveBeenCalledWith({
      url: 'https://collector.example/collect/app',
      app: {
        name: 'mana-forge-web',
        version: '1.0.12',
        environment: 'production',
      },
      instrumentations: [{ name: 'tracing' }],
    });
  });
});
