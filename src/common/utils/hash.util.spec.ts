import * as bcrypt from 'bcrypt';
import { hashPassword, isBcryptHash } from './hash.util';

describe('hash.util', () => {
  describe('isBcryptHash', () => {
    it('returns true for a bcrypt output string', async () => {
      const hash = await bcrypt.hash('plain-secret', 4);
      expect(isBcryptHash(hash)).toBe(true);
    });

    it('returns false for plaintext', () => {
      expect(isBcryptHash('SuperAdmin@2024')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isBcryptHash('')).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('produces a value that isBcryptHash recognizes', async () => {
      const h = await hashPassword('x');
      expect(isBcryptHash(h)).toBe(true);
    });
  });
});
