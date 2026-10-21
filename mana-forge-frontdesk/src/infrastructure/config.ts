export const config = {
  // Demo mode is an explicit opt-in; a failing API must never fall back to seeds.
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  apiUrl: (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, ''),
};
