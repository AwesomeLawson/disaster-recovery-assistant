import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth.service';
import * as firebaseAuth from 'firebase/auth';

vi.mock('firebase/auth');

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('calls createUserWithEmailAndPassword with correct parameters', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      const result = await authService.register('test@example.com', 'password123');

      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('calls signInWithEmailAndPassword with correct parameters', async () => {
      const mockUser = { uid: '123', email: 'test@example.com' };
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      const result = await authService.login('test@example.com', 'password123');

      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('calls signOut', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValue();

      await authService.logout();

      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });
  });
});
