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

import * as functions from '../baseCamps';

describe('Base Camp Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createBaseCamp', () => {
    it('should create a new base camp when called by administrator', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        id: 'baseCamp123',
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

      wrapped = testEnv.wrap(functions.createBaseCamp);

      const data = {
        name: 'First Baptist Church',
        address: '123 Main St, City, State',
        latitude: 35.0,
        longitude: -80.0,
        eventIds: ['event123'],
        leadUserIds: ['user1', 'user2'],
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.baseCampId).toBe('baseCamp123');
      expect(mockSet).toHaveBeenCalled();
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createBaseCamp);

      const data = {
        name: 'Test Base Camp',
        address: '123 Test St',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject creation by non-administrator', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['volunteer'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createBaseCamp);

      const data = {
        name: 'Test Base Camp',
        address: '123 Test St',
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

      wrapped = testEnv.wrap(functions.createBaseCamp);

      const data = {
        name: 'Test Base Camp',
        // missing address
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields: name, address');
    });
  });

  describe('updateBaseCamp', () => {
    it('should update a base camp when called by administrator', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'baseCamp123', name: 'Old Name' }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateBaseCamp);

      const data = {
        baseCampId: 'baseCamp123',
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
        data: () => ({ roles: ['volunteer'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateBaseCamp);

      const data = {
        baseCampId: 'baseCamp123',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can perform this action');
    });

    it('should throw error when base camp not found', async () => {
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

      wrapped = testEnv.wrap(functions.updateBaseCamp);

      const data = {
        baseCampId: 'nonexistent',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Base camp not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.updateBaseCamp);

      const data = {
        baseCampId: 'baseCamp123',
        updates: { name: 'New Name' },
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('getBaseCamp', () => {
    it('should retrieve base camp data', async () => {
      const baseCampData = {
        id: 'baseCamp123',
        name: 'Test Base Camp',
        address: '123 Main St',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => baseCampData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getBaseCamp);

      const data = { baseCampId: 'baseCamp123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.baseCamp).toEqual(baseCampData);
    });

    it('should throw error when base camp not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getBaseCamp);

      const data = { baseCampId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Base camp not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getBaseCamp);

      const data = { baseCampId: 'baseCamp123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing baseCampId', async () => {
      wrapped = testEnv.wrap(functions.getBaseCamp);

      const data = {};
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required field: baseCampId');
    });
  });

  describe('listBaseCamps', () => {
    it('should list all base camps', async () => {
      const baseCamps = [
        { id: 'baseCamp1', name: 'Base Camp 1' },
        { id: 'baseCamp2', name: 'Base Camp 2' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: baseCamps.map(baseCamp => ({ data: () => baseCamp })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockWhere: any = jest.fn(() => ({ limit: mockLimit }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listBaseCamps);

      const data = { limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.baseCamps).toBeDefined();
      expect(Array.isArray(result.baseCamps)).toBe(true);
    });

    it('should filter base camps by eventId', async () => {
      const baseCamps = [
        { id: 'baseCamp1', name: 'Base Camp 1', eventIds: ['event123'] },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: baseCamps.map(baseCamp => ({ data: () => baseCamp })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockWhere: any = jest.fn(() => ({ limit: mockLimit }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listBaseCamps);

      const data = { eventId: 'event123', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.baseCamps).toBeDefined();
      expect(mockWhere).toHaveBeenCalledWith('eventIds', 'array-contains', 'event123');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listBaseCamps);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });
});
