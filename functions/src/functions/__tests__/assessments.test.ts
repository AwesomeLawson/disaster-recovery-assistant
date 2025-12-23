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

import * as functions from '../assessments';

describe('Assessment Management Functions', () => {
  let wrapped: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('createAssessment', () => {
    it('should create a new assessment when called by assessor', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'assessment123',
      }));
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['assessor'] }),
      });

      mockFirestore.collection = jest.fn((collectionName: string) => {
        if (collectionName === 'users') {
          return { doc: jest.fn(() => ({ get: mockGet })) };
        }
        return { doc: mockDoc };
      });

      wrapped = testEnv.wrap(functions.createAssessment);

      const data = {
        placeName: 'John Doe Residence',
        address: '456 Oak St, City, State',
        latitude: 35.5,
        longitude: -80.5,
        centerId: 'center123',
        groupId: 'group123',
        damages: 'Roof damage, flooding',
        needs: 'Roof repair, cleanup',
        affectedPeople: 4,
        severity: 'moderate',
        photoUrls: ['https://example.com/photo1.jpg'],
        legalReleaseUrl: 'https://example.com/release.pdf',
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.assessmentId).toBe('assessment123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'assessment123',
          placeName: 'John Doe Residence',
          assessorId: 'assessor123',
          reassessmentCount: 0,
          flaggedForReview: false,
        })
      );
    });

    it('should reject creation without authentication', async () => {
      wrapped = testEnv.wrap(functions.createAssessment);

      const data = {
        placeName: 'Test Place',
        address: '123 Test St',
        centerId: 'center123',
        groupId: 'group123',
        damages: 'Test damage',
        needs: 'Test needs',
        affectedPeople: 2,
        severity: 'low',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject creation by non-assessor', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createAssessment);

      const data = {
        placeName: 'Test Place',
        address: '123 Test St',
        centerId: 'center123',
        groupId: 'group123',
        damages: 'Test damage',
        needs: 'Test needs',
        affectedPeople: 2,
        severity: 'low',
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only assessors can perform this action');
    });

    it('should reject creation with missing required fields', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['assessor'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.createAssessment);

      const data = {
        placeName: 'Test Place',
        // missing required fields
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateAssessment', () => {
    it('should allow assessor to update their own assessment', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ assessorId: 'assessor123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['assessor'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateAssessment);

      const data = {
        assessmentId: 'assessment123',
        updates: { damages: 'Updated damages' },
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should allow administrator to update any assessment', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ assessorId: 'assessor123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['administrator'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateAssessment);

      const data = {
        assessmentId: 'assessment123',
        updates: { damages: 'Updated damages' },
      };

      const context = {
        auth: { uid: 'admin123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
    });

    it('should prevent non-owner assessor from updating assessment', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ assessorId: 'assessor123' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['assessor'] }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateAssessment);

      const data = {
        assessmentId: 'assessment123',
        updates: { damages: 'Updated damages' },
      };

      const context = {
        auth: { uid: 'assessor456', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Permission denied');
    });

    it('should throw error when assessment not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.updateAssessment);

      const data = {
        assessmentId: 'nonexistent',
        updates: { damages: 'Updated damages' },
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Assessment not found');
    });
  });

  describe('reassessment', () => {
    it('should perform reassessment and increment count', async () => {
      const mockUpdate = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['assessor'] }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ reassessmentCount: 0 }),
        });

      const mockDoc = jest.fn(() => ({ get: mockGet, update: mockUpdate }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.reassessment);

      const data = {
        assessmentId: 'assessment123',
        updates: { severity: 'high' },
        flagForReview: true,
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reassessmentCount: 1,
          flaggedForReview: true,
        })
      );
    });

    it('should reject reassessment by non-assessor', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ roles: ['worker'] }),
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.reassessment);

      const data = {
        assessmentId: 'assessment123',
        updates: { severity: 'high' },
      };

      const context = {
        auth: { uid: 'user123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Only assessors can perform this action');
    });

    it('should throw error when assessment not found', async () => {
      const mockGet = jest.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ roles: ['assessor'] }),
        })
        .mockResolvedValueOnce({
          exists: false,
        });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.reassessment);

      const data = {
        assessmentId: 'nonexistent',
        updates: { severity: 'high' },
      };

      const context = {
        auth: { uid: 'assessor123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Assessment not found');
    });
  });

  describe('getAssessment', () => {
    it('should retrieve assessment data', async () => {
      const assessmentData = {
        id: 'assessment123',
        placeName: 'Test Place',
        damages: 'Test damages',
      };

      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => assessmentData,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getAssessment);

      const data = { assessmentId: 'assessment123' };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.assessment).toEqual(assessmentData);
    });

    it('should throw error when assessment not found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: false,
      });

      const mockDoc = jest.fn(() => ({ get: mockGet }));
      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.getAssessment);

      const data = { assessmentId: 'nonexistent' };
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Assessment not found');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getAssessment);

      const data = { assessmentId: 'assessment123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });
  });

  describe('listAssessments', () => {
    it('should list all assessments with filters', async () => {
      const assessments = [
        { id: 'assessment1', placeName: 'Place 1', centerId: 'center123' },
        { id: 'assessment2', placeName: 'Place 2', centerId: 'center123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: assessments.map(assessment => ({ data: () => assessment })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));

      wrapped = testEnv.wrap(functions.listAssessments);

      const data = { centerId: 'center123', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.assessments).toBeDefined();
      expect(Array.isArray(result.assessments)).toBe(true);
    });

    it('should filter assessments by flaggedForReview', async () => {
      const assessments = [
        { id: 'assessment1', placeName: 'Place 1', flaggedForReview: true },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: assessments.map(assessment => ({ data: () => assessment })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));

      wrapped = testEnv.wrap(functions.listAssessments);

      const data = { flaggedForReview: true, limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.assessments).toBeDefined();
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.listAssessments);

      await expect(wrapped({}, {})).rejects.toThrow('User must be authenticated');
    });
  });
});