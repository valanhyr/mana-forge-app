import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faroUrl = import.meta.env.VITE_FARO_URL as string | undefined;

if (faroUrl) {
  initializeFaro({
    url: faroUrl,
    app: {
      name: (import.meta.env.VITE_FARO_APP_NAME as string) || 'mana-forge-web',
      version: '1.0.13',
      environment: import.meta.env.MODE,
    },
    instrumentations: [
      ...getWebInstrumentations({ captureConsole: true }),
      new TracingInstrumentation(),
    ],
  });
}
