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

import * as functions from '../groups';

describe('Group Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createGroup', () => {
    it('should create a new group when called by administrator', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'group123'
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
        return { doc: mockDoc };
      });
      mockFirestore.batch = mockBatch;

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.createGroup);

      const data = {
        name: 'Hurricane Relief',
        eventType: 'hurricane',
        description: 'Relief efforts for Hurricane X',
        userIds: ['user1', 'user2'],
        centerIds: ['center1'],
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe('group123');
      expect(mockSet).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createGroup);

      const data = {
        name: 'Test Group',
        eventType: 'storm',
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

      wrapped = testEnv.wrap(functions.createGroup);

      const data = {
        name: 'Test Group',
        eventType: 'storm',
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

      wrapped = testEnv.wrap(functions.createGroup);

      const data = {
        name: 'Test Group',
        // missing eventType
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields: name, eventType');
    });
  });

  describe('updateGroup', () => {
    it('should update a group when called by administrator', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'group123', name: 'Old Name' }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateGroup);

      const data = {
        groupId: 'group123',
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

      wrapped = testEnv.wrap(functions.updateGroup);

      const data = {
        groupId: 'group123',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can perform this action');
    });

    it('should throw error when group not found', async () => {
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

      wrapped = testEnv.wrap(functions.updateGroup);

      const data = {
        groupId: 'nonexistent',
        updates: { name: 'New Name' },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Group not found');
    });
  });

  describe('getGroup', () => {
    it('should retrieve group data', async () => {
      const groupData = {
        id: 'group123',
        name: 'Test Group',
        eventType: 'storm',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => groupData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getGroup);

      const data = { groupId: 'group123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.group).toEqual(groupData);
    });

    it('should throw error when group not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getGroup);

      const data = { groupId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Group not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getGroup);

      const data = { groupId: 'group123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('listGroups', () => {
    it('should list all groups', async () => {
      const groups = [
        { id: 'group1', name: 'Group 1' },
        { id: 'group2', name: 'Group 2' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: groups.map(group => ({ data: () => group })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ limit: mockLimit }));

      wrapped = testEnv.wrap(functions.listGroups);

      const data = { limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.groups).toBeDefined();
      expect(Array.isArray(result.groups)).toBe(true);
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listGroups);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('addUserToGroup', () => {
    it('should add user to group when called by administrator', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'group123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'user456' }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.addUserToGroup);

      const data = {
        groupId: 'group123',
        userId: 'user456',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject when group not found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: false,
        })
        .mockResolvedValueOnce({
          exists: true,
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.addUserToGroup);

      const data = {
        groupId: 'nonexistent',
        userId: 'user456',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Group not found');
    });

    it('should reject when user not found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
        })
        .mockResolvedValueOnce({
          exists: false,
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.addUserToGroup);

      const data = {
        groupId: 'group123',
        userId: 'nonexistent',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('User not found');
    });

    it('should reject by non-administrator', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.addUserToGroup);

      const data = {
        groupId: 'group123',
        userId: 'user456',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only administrators can perform this action');
    });
  });
});