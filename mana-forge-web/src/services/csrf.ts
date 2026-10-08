import { api } from './api';

export async function csrfHeaders(endpoint: '/support/csrf' | '/newsletter/csrf') {
  const { data } = await api.get<{ headerName: string; token: string }>(endpoint);
  if (data.headerName !== 'X-CSRF-TOKEN' || !data.token) throw new Error('Invalid CSRF response');
  return { [data.headerName]: data.token };
}
