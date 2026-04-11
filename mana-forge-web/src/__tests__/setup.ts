import '@testing-library/jest-dom';
import axios from 'axios';
import { server } from './mocks/server';

// localStorage mock — jsdom en Node 25 no expone correctamente los métodos Storage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Forzar el adaptador http de Node para que MSW intercepte las peticiones de axios
// En jsdom, axios usa XMLHttpRequest por defecto, que MSW Node no intercepta
axios.defaults.adapter = 'http';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
