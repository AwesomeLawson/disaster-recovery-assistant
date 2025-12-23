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

import * as functions from '../legalReleases';

describe('Legal Release Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createLegalRelease', () => {
    it('should create legal release for own user', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        id: 'release123',
      }));

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        userId: 'user123',
        releaseType: 'volunteer',
        documentUrl: 'https://example.com/release.pdf',
        signatureImageUrl: 'https://example.com/signature.png',
        signedDigitally: true,
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.releaseId).toBe('release123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'release123',
          userId: 'user123',
          releaseType: 'volunteer',
          signedDigitally: true,
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          legalReleaseId: 'release123',
          legalReleaseSigned: false,
        })
      );
    });

    it('should allow administrator to create release for other user', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['administrator'] }),
      });
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        get: mockGet,
        id: 'release456',
      }));

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet, update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        userId: 'user456',
        releaseType: 'property',
        documentUrl: 'https://example.com/property-release.pdf',
        assessmentId: 'assessment123',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should prevent non-admin from creating release for other user', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        userId: 'user456',
        releaseType: 'volunteer',
        documentUrl: 'https://example.com/release.pdf',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        userId: 'user123',
        releaseType: 'volunteer',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject creation with missing required fields', async () => {
      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        // missing userId and releaseType
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields: userId, releaseType');
    });

    it('should create property release for assessment', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'release789',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createLegalRelease);

      const data = {
        userId: 'user123',
        releaseType: 'property',
        documentUrl: 'https://example.com/property-release.pdf',
        assessmentId: 'assessment123',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          releaseType: 'property',
          assessmentId: 'assessment123',
        })
      );
    });
  });

  describe('signLegalRelease', () => {
    it('should allow user to sign their own release', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'release123',
          userId: 'user123',
          releaseType: 'volunteer',
        }),
      });

      const mockDoc = jest.fn(() => ({
        get: mockGet,
        update: mockUpdate,
      }));

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'release123',
        signatureImageUrl: 'https://example.com/signature.png',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          signedDigitally: true,
          signatureImageUrl: 'https://example.com/signature.png',
        })
      );
    });

    it('should update user document when signing volunteer release', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'release123',
          userId: 'user123',
          releaseType: 'volunteer',
        }),
      });

      const mockDoc = jest.fn(() => ({
        get: mockGet,
        update: mockUpdate,
      }));

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'release123',
        signatureImageUrl: 'https://example.com/signature.png',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await wrapped(data, context);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          legalReleaseSigned: true,
        })
      );
    });

    it('should not update user document when signing non-volunteer release', async () => {
      const mockReleaseUpdate = jest.fn().mockResolvedValue(undefined);
      const mockUserUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'release123',
          userId: 'user123',
          releaseType: 'property',
        }),
      });

      const mockDoc = jest.fn(() => ({
        get: mockGet,
        update: mockReleaseUpdate,
      }));

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ update: mockUserUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'release123',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUserUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          legalReleaseSigned: true,
        })
      );
    });

    it('should prevent user from signing someone else\'s release', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'release123',
          userId: 'user456',
          releaseType: 'volunteer',
        }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'release123',
        signatureImageUrl: 'https://example.com/signature.png',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Can only sign your own releases');
    });

    it('should throw error when release not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'nonexistent',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Legal release not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.signLegalRelease);

      const data = {
        releaseId: 'release123',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getLegalRelease', () => {
    it('should allow user to view their own release', async () => {
      const releaseData = {
        id: 'release123',
        userId: 'user123',
        releaseType: 'volunteer',
        signedDigitally: true,
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => releaseData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = { releaseId: 'release123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.release).toEqual(releaseData);
    });

    it('should allow administrator to view any release', async () => {
      const releaseData = {
        id: 'release123',
        userId: 'user456',
        releaseType: 'volunteer',
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => releaseData,
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = { releaseId: 'release123' };
      const context = { auth: { uid: 'admin123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.release).toEqual(releaseData);
    });

    it('should prevent non-admin from viewing other user\'s release', async () => {
      const releaseData = {
        id: 'release123',
        userId: 'user456',
        releaseType: 'volunteer',
      };

      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => releaseData,
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = { releaseId: 'release123' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when release not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = { releaseId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Legal release not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = { releaseId: 'release123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing releaseId', async () => {
      wrapped = testEnv.wrap(functions.getLegalRelease);

      const data = {};
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required field: releaseId');
    });
  });
});