import '@testing-library/jest-dom';
import axios from 'axios';
import { server } from './mocks/server';

// Forzar el adaptador http de Node para que MSW intercepte las peticiones de axios
// En jsdom, axios usa XMLHttpRequest por defecto, que MSW Node no intercepta
axios.defaults.adapter = 'http';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
