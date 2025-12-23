import * as admin from 'firebase-admin';
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

import * as functions from '../workgroups';

describe('Workgroup Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createWorkgroup', () => {
    it('should create a new workgroup when called by workgroup lead', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'workgroup123',
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['workGroupLead'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createWorkgroup);

      const data = {
        name: 'Repair Team Alpha',
        centerId: 'center123',
        groupId: 'group123',
        leadUserId: 'lead123',
        workerUserIds: ['worker1', 'worker2'],
        assessmentId: 'assessment123',
        taskDescription: 'Roof repair and cleanup',
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.workgroupId).toBe('workgroup123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workgroup123',
          name: 'Repair Team Alpha',
          taskStatus: 'notStarted',
          progressNotes: [],
          photoUrls: [],
        })
      );
    });

    it('should allow administrator to create workgroup', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'workgroup123',
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['administrator'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createWorkgroup);

      const data = {
        name: 'Repair Team Alpha',
        centerId: 'center123',
        groupId: 'group123',
        leadUserId: 'lead123',
        assessmentId: 'assessment123',
        taskDescription: 'Roof repair',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject creation by non-workgroup-lead/non-admin', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createWorkgroup);

      const data = {
        name: 'Test Workgroup',
        centerId: 'center123',
        groupId: 'group123',
        leadUserId: 'lead123',
        assessmentId: 'assessment123',
        taskDescription: 'Test task',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only work group leads or administrators can perform this action');
    });

    it('should reject creation with missing required fields', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['workGroupLead'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createWorkgroup);

      const data = {
        name: 'Test Workgroup',
        // missing required fields
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateWorkgroup', () => {
    it('should allow workgroup lead to update their workgroup', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['workGroupLead'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        updates: { name: 'Updated Name' },
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should allow worker to update their assigned workgroup', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: ['worker123'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        updates: { taskStatus: 'inProgress' },
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should prevent unauthorized users from updating workgroup', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        updates: { name: 'Updated Name' },
      };

      const context = {
        auth: { uid: 'user456', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when workgroup not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroup);

      const data = {
        workgroupId: 'nonexistent',
        updates: { name: 'Updated Name' },
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Workgroup not found');
    });
  });

  describe('updateWorkgroupStatus', () => {
    it('should update workgroup status with notes and photos', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: ['worker123'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.updateWorkgroupStatus);

      const data = {
        workgroupId: 'workgroup123',
        status: 'inProgress',
        note: 'Started roof repair',
        photoUrls: ['https://example.com/photo1.jpg'],
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject status update by unauthorized user', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroupStatus);

      const data = {
        workgroupId: 'workgroup123',
        status: 'inProgress',
      };

      const context = {
        auth: { uid: 'user456', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when workgroup not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateWorkgroupStatus);

      const data = {
        workgroupId: 'nonexistent',
        status: 'inProgress',
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Workgroup not found');
    });
  });

  describe('addWorkerToWorkgroup', () => {
    it('should allow workgroup lead to add worker', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['workGroupLead'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.addWorkerToWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        userId: 'worker456',
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should allow administrator to add worker', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      (admin.firestore as any).FieldValue = {
        arrayUnion: jest.fn((value: any) => value),
      };

      wrapped = testEnv.wrap(functions.addWorkerToWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        userId: 'worker456',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject worker addition by non-lead/non-admin', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ leadUserId: 'lead123', workerUserIds: [] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.addWorkerToWorkgroup);

      const data = {
        workgroupId: 'workgroup123',
        userId: 'worker456',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only work group leads or administrators can add workers');
    });
  });

  describe('getWorkgroup', () => {
    it('should retrieve workgroup data', async () => {
      const workgroupData = {
        id: 'workgroup123',
        name: 'Repair Team Alpha',
        taskStatus: 'inProgress',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => workgroupData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getWorkgroup);

      const data = { workgroupId: 'workgroup123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.workgroup).toEqual(workgroupData);
    });

    it('should throw error when workgroup not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getWorkgroup);

      const data = { workgroupId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Workgroup not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getWorkgroup);

      const data = { workgroupId: 'workgroup123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('listWorkgroups', () => {
    it('should list workgroups with filters', async () => {
      const workgroups = [
        { id: 'workgroup1', name: 'Team 1', centerId: 'center123' },
        { id: 'workgroup2', name: 'Team 2', centerId: 'center123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: workgroups.map(wg => ({ data: () => wg })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));

      wrapped = testEnv.wrap(functions.listWorkgroups);

      const data = { centerId: 'center123', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.workgroups).toBeDefined();
      expect(Array.isArray(result.workgroups)).toBe(true);
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listWorkgroups);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });
});