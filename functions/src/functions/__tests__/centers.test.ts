import * as admin from 'firebase-admin';
import test from 'firebase-functions-test';

const testEnv = test();

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(),
  batch: jest.fn(),
};

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockFirestore),
  initializeApp: jest.fn(),
}));

import * as functions from '../centers';

describe('Center Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createCenter', () => {
    it('should create a new center when called by administrator', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        id: 'center123',
      }));
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockBatchUpdate = jest.fn();
      const mockBatch = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['administrator'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet, update: jest.fn() })) };
        }
        if (collectionName === 'groups') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });
      mockFirestore.batch = mockBatch;

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.createCenter);

      const data = {
        name: 'First Baptist Church',
        address: '123 Main St, City, State',
        latitude: 35.0,
        longitude: -80.0,
        groupId: 'group123',
        leadUserIds: ['user1', 'user2'],
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.centerId).toBe('center123');
      expect(mockSet).toHaveBeenCalled();
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createCenter);

      const data = {
        name: 'Test Center',
        address: '123 Test St',
        groupId: 'group123',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject creation by non-administrator', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createCenter);

      const data = {
        name: 'Test Center',
        address: '123 Test St',
        groupId: 'group123',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can perform this action');
    });

    it('should reject creation with missing required fields', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['administrator'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createCenter);

      const data = {
        name: 'Test Center',
        // missing address and groupId
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields: name, address, groupId');
    });
  });

  describe('updateCenter', () => {
    it('should update a center when called by administrator', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'center123', name: 'Old Name' }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateCenter);

      const data = {
        centerId: 'center123',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject update by non-administrator', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateCenter);

      const data = {
        centerId: 'center123',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can perform this action');
    });

    it('should throw error when center not found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: false,
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateCenter);

      const data = {
        centerId: 'nonexistent',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Center not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.updateCenter);

      const data = {
        centerId: 'center123',
        updates: { name: 'New Name' },
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getCenter', () => {
    it('should retrieve center data', async () => {
      const centerData = {
        id: 'center123',
        name: 'Test Center',
        address: '123 Main St',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => centerData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getCenter);

      const data = { centerId: 'center123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.center).toEqual(centerData);
    });

    it('should throw error when center not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getCenter);

      const data = { centerId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Center not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getCenter);

      const data = { centerId: 'center123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing centerId', async () => {
      wrapped = testEnv.wrap(functions.getCenter);

      const data = {};
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required field: centerId');
    });
  });

  describe('listCenters', () => {
    it('should list all centers', async () => {
      const centers = [
        { id: 'center1', name: 'Center 1' },
        { id: 'center2', name: 'Center 2' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: centers.map(center => ({ data: () => center })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockWhere: any = jest.fn(() => ({ limit: mockLimit }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listCenters);

      const data = { limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.centers).toBeDefined();
      expect(Array.isArray(result.centers)).toBe(true);
    });

    it('should filter centers by groupId', async () => {
      const centers = [
        { id: 'center1', name: 'Center 1', groupId: 'group123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: centers.map(center => ({ data: () => center })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockWhere: any = jest.fn(() => ({ limit: mockLimit }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listCenters);

      const data = { groupId: 'group123', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.centers).toBeDefined();
      expect(mockWhere).toHaveBeenCalledWith('groupId', '==', 'group123');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listCenters);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });
});