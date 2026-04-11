import { describe, it, expect } from 'vitest';
import { getAvatarUrl, DEFAULT_AVATAR, AVATAR_OPTIONS } from '../../../../core/utils/avatar';

describe('avatar utils', () => {
  describe('DEFAULT_AVATAR', () => {
    it('es "ava1.jpg"', () => {
      expect(DEFAULT_AVATAR).toBe('ava1.jpg');
    });
  });

  describe('AVATAR_OPTIONS', () => {
    it('contiene exactamente 105 entradas', () => {
      expect(AVATAR_OPTIONS).toHaveLength(105);
    });

    it('el primero es "ava1.jpg" y el último "ava105.jpg"', () => {
      expect(AVATAR_OPTIONS[0]).toBe('ava1.jpg');
      expect(AVATAR_OPTIONS[104]).toBe('ava105.jpg');
    });
  });

  describe('getAvatarUrl', () => {
    it('retorna la URL correcta para un avatar válido', () => {
      expect(getAvatarUrl('ava5.jpg')).toBe('/images/avatars/ava5.jpg');
    });

    it('usa el avatar por defecto cuando se pasa null', () => {
      expect(getAvatarUrl(null)).toBe('/images/avatars/ava1.jpg');
    });

    it('usa el avatar por defecto cuando se pasa undefined', () => {
      expect(getAvatarUrl(undefined)).toBe('/images/avatars/ava1.jpg');
    });
  });
});
