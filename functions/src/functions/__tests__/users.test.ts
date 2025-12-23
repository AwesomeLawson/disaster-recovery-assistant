import test from 'firebase-functions-test';

const testEnv = test();

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
};

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockFirestore),
  initializeApp: jest.fn(),
}));

import * as functions from '../users';

describe('User Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('registerUser', () => {
    it('should register a new user with valid data', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({ set: mockSet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.registerUser);

      const data = {
        email: 'test@example.com',
        phoneNumber: '555-1234',
        communicationPreference: 'email',
        requestedRoles: ['assessor'],
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user123',
          email: 'test@example.com',
          phoneNumber: '555-1234',
          communicationPreference: 'email',
          requestedRoles: ['assessor'],
          roles: [],
          roleApprovalStatus: 'pending',
          legalReleaseSigned: false,
        })
      );
    });

    it('should reject registration without authentication', async () => {
      wrapped = testEnv.wrap(functions.registerUser);

      const data = {
        email: 'test@example.com',
        phoneNumber: '555-1234',
        communicationPreference: 'email',
        requestedRoles: ['assessor'],
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject registration with missing required fields', async () => {
      wrapped = testEnv.wrap(functions.registerUser);

      const data = {
        email: 'test@example.com',
        // missing phoneNumber, communicationPreference, requestedRoles
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields');
    });
  });

  describe('approveUserRole', () => {
    it('should approve user role when called by administrator', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ requestedRoles: ['assessor'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.approveUserRole);

      const data = {
        userId: 'user456',
        approve: true,
        roles: ['assessor'],
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['assessor'],
          roleApprovalStatus: 'approved',
        })
      );
    });

    it('should reject role approval when called by non-administrator', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.approveUserRole);

      const data = {
        userId: 'user456',
        approve: true,
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can approve roles');
    });

    it('should reject user role when approve is false', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ requestedRoles: ['assessor'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.approveUserRole);

      const data = {
        userId: 'user456',
        approve: false,
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          roleApprovalStatus: 'rejected',
        })
      );
    });
  });

  describe('updateUserProfile', () => {
    it('should allow user to update their own profile', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'user123', email: 'test@example.com' }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateUserProfile);

      const data = {
        userId: 'user123',
        updates: {
          phoneNumber: '555-9999',
          communicationPreference: 'sms',
        },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phoneNumber: '555-9999',
          communicationPreference: 'sms',
        })
      );
    });

    it('should allow administrator to update any profile', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'user456' }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateUserProfile);

      const data = {
        userId: 'user456',
        updates: {
          phoneNumber: '555-8888',
        },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should prevent non-admin from updating other users profiles', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateUserProfile);

      const data = {
        userId: 'user456',
        updates: { phoneNumber: '555-8888' },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });
  });

  describe('getUser', () => {
    it('should retrieve user data', async () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        phoneNumber: '555-1234',
        roles: ['assessor'],
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => userData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getUser);

      const data = { userId: 'user123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.user).toEqual(userData);
    });

    it('should throw error when user not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getUser);

      const data = { userId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('User not found');
    });
  });

  describe('listUsers', () => {
    it('should list all users with optional filters', async () => {
      const users = [
        { id: 'user1', roles: ['assessor'] },
        { id: 'user2', roles: ['worker'] },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: users.map(user => ({ data: () => user })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockWhere: any = jest.fn(() => ({ limit: mockLimit }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listUsers);

      const data = { role: 'assessor', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.users).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });
  });
});