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

import * as functions from '../escalations';

describe('Escalation Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createEscalation', () => {
    it('should create escalation when called by workgroup lead', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        id: 'escalation123',
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['workGroupLead'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet })) };
        }
        if (collectionName === 'workgroups') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createEscalation);

      const data = {
        workgroupId: 'workgroup123',
        centerId: 'center123',
        groupId: 'group123',
        type: 'reassessment',
        reason: 'Damage worse than initially assessed',
        assessmentId: 'assessment123',
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.escalationId).toBe('escalation123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'escalation123',
          status: 'pending',
          type: 'reassessment',
          createdBy: 'lead123',
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          taskStatus: 'needsEscalation',
        })
      );
    });

    it('should allow assessor to create escalation', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        update: mockUpdate,
        id: 'escalation123',
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['assessor'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet })) };
        }
        if (collectionName === 'workgroups') {
          return { doc: jest.fn(() => ({ update: mockUpdate })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createEscalation);

      const data = {
        workgroupId: 'workgroup123',
        centerId: 'center123',
        groupId: 'group123',
        type: 'thirdParty',
        reason: 'Requires specialized contractor',
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject creation by worker', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createEscalation);

      const data = {
        workgroupId: 'workgroup123',
        centerId: 'center123',
        groupId: 'group123',
        type: 'reassessment',
        reason: 'Test reason',
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only work group leads or assessors can create escalations');
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createEscalation);

      const data = {
        workgroupId: 'workgroup123',
        centerId: 'center123',
        groupId: 'group123',
        type: 'reassessment',
        reason: 'Test reason',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject creation with missing required fields', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['workGroupLead'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createEscalation);

      const data = {
        workgroupId: 'workgroup123',
        // missing required fields
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateEscalationStatus', () => {
    it('should allow administrator to update escalation status', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123', status: 'pending' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateEscalationStatus);

      const data = {
        escalationId: 'escalation123',
        status: 'inProgress',
        assignedTo: 'admin123',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inProgress',
          assignedTo: 'admin123',
        })
      );
    });

    it('should allow workgroup lead to update escalation status', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123', status: 'pending' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['workGroupLead'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateEscalationStatus);

      const data = {
        escalationId: 'escalation123',
        status: 'inProgress',
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject update by worker', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateEscalationStatus);

      const data = {
        escalationId: 'escalation123',
        status: 'inProgress',
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when escalation not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateEscalationStatus);

      const data = {
        escalationId: 'nonexistent',
        status: 'inProgress',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Escalation not found');
    });
  });

  describe('resolveEscalation', () => {
    it('should allow administrator to resolve escalation', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123', status: 'inProgress' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.resolveEscalation);

      const data = {
        escalationId: 'escalation123',
        resolution: 'Contractor assigned to handle repair',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'resolved',
          resolution: 'Contractor assigned to handle repair',
        })
      );
    });

    it('should allow workgroup lead to resolve escalation', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123', status: 'inProgress' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['workGroupLead'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.resolveEscalation);

      const data = {
        escalationId: 'escalation123',
        resolution: 'Issue resolved',
      };

      const context = {
        auth: { uid: 'lead123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should reject resolution by non-admin/non-lead', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ id: 'escalation123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['worker'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.resolveEscalation);

      const data = {
        escalationId: 'escalation123',
        resolution: 'Issue resolved',
      };

      const context = {
        auth: { uid: 'worker123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when escalation not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.resolveEscalation);

      const data = {
        escalationId: 'nonexistent',
        resolution: 'Issue resolved',
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Escalation not found');
    });
  });

  describe('getEscalation', () => {
    it('should retrieve escalation data', async () => {
      const escalationData = {
        id: 'escalation123',
        type: 'reassessment',
        status: 'pending',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => escalationData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getEscalation);

      const data = { escalationId: 'escalation123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.escalation).toEqual(escalationData);
    });

    it('should throw error when escalation not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getEscalation);

      const data = { escalationId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Escalation not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getEscalation);

      const data = { escalationId: 'escalation123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('listEscalations', () => {
    it('should list escalations with filters', async () => {
      const escalations = [
        { id: 'escalation1', type: 'reassessment', centerId: 'center123' },
        { id: 'escalation2', type: 'thirdParty', centerId: 'center123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: escalations.map(esc => ({ data: () => esc })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));

      wrapped = testEnv.wrap(functions.listEscalations);

      const data = { centerId: 'center123', status: 'pending', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.escalations).toBeDefined();
      expect(Array.isArray(result.escalations)).toBe(true);
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listEscalations);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });
});