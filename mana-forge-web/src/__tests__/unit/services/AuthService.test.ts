import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { AuthService } from '../../../services/AuthService';
import { mockUser } from '../../mocks/handlers';

const BASE = 'http://localhost:8080';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('resuelve con el objeto User en caso de éxito', async () => {
      const user = await AuthService.login('testuser', 'pass123');
      expect(user.userId).toBe(mockUser.userId);
      expect(user.username).toBe(mockUser.username);
    });

    it('lanza error genérico cuando la respuesta no es ok', async () => {
      server.use(http.post(`${BASE}/users/login`, () => new HttpResponse(null, { status: 401 })));
      await expect(AuthService.login('bad', 'bad')).rejects.toThrow('Error en las credenciales');
    });

    it('lanza EMAIL_NOT_VERIFIED cuando el backend responde 403 con ese código', async () => {
      server.use(
        http.post(`${BASE}/users/login`, () =>
          HttpResponse.json({ error: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
        )
      );
      await expect(AuthService.login('user', 'pass')).rejects.toThrow('EMAIL_NOT_VERIFIED');
    });
  });

  describe('register', () => {
    it('resuelve con el objeto User en caso de éxito', async () => {
      const user = await AuthService.register('newuser', 'new@example.com', 'pass');
      expect(user.userId).toBe(mockUser.userId);
    });

    it('lanza el mensaje del backend si la respuesta no es ok', async () => {
      server.use(
        http.post(`${BASE}/users`, () =>
          HttpResponse.json({ message: 'El nombre de usuario ya existe' }, { status: 409 })
        )
      );
      await expect(AuthService.register('existing', 'e@e.com', 'pass')).rejects.toThrow(
        'El nombre de usuario ya existe'
      );
    });
  });

  describe('checkSession', () => {
    it('resuelve con User si la sesión es válida', async () => {
      const user = await AuthService.checkSession();
      expect(user.userId).toBe(mockUser.userId);
    });

    it('lanza error si la sesión no es válida', async () => {
      server.use(http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })));
      await expect(AuthService.checkSession()).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('llama POST /users/logout sin lanzar error', async () => {
      await expect(AuthService.logout()).resolves.toBeUndefined();
    });
  });

  describe('changePassword', () => {
    it('lanza "wrongPassword" cuando el servidor responde 401', async () => {
      server.use(
        http.patch(`${BASE}/users/me/password`, () => new HttpResponse(null, { status: 401 }))
      );
      await expect(AuthService.changePassword('old', 'new')).rejects.toThrow('wrongPassword');
    });

    it('lanza "changePasswordFailed" para otros errores', async () => {
      server.use(
        http.patch(`${BASE}/users/me/password`, () => new HttpResponse(null, { status: 500 }))
      );
      await expect(AuthService.changePassword('old', 'new')).rejects.toThrow(
        'changePasswordFailed'
      );
    });
  });

  describe('verifyEmail', () => {
    it('resuelve si el token es válido', async () => {
      await expect(AuthService.verifyEmail('valid-token')).resolves.toBeUndefined();
    });

    it('lanza INVALID_TOKEN si la respuesta no es ok', async () => {
      server.use(http.get(`${BASE}/users/verify`, () => new HttpResponse(null, { status: 400 })));
      await expect(AuthService.verifyEmail('bad-token')).rejects.toThrow('INVALID_TOKEN');
    });
  });

  describe('updateProfile', () => {
    it('llama PATCH /users/me y retorna el User actualizado', async () => {
      const updated = await AuthService.updateProfile({ biography: 'Bio', avatar: 'ava2.jpg' });
      expect(updated.userId).toBe(mockUser.userId);
    });
  });
});
