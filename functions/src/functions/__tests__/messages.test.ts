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

import * as functions from '../messages';

describe('Message Management Functions', () => {
  let wrapped: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('sendMessage', () => {
    it('should send a message with valid data', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'message123',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendMessage);

      const data = {
        threadId: 'thread123',
        recipientIds: ['user1', 'user2'],
        content: 'Hello team!',
        type: 'sms',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message123');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'message123',
          threadId: 'thread123',
          senderId: 'sender123',
          recipientIds: ['user1', 'user2'],
          content: 'Hello team!',
          type: 'sms',
        })
      );
    });

    it('should reject sending message without authentication', async () => {
      wrapped = testEnv.wrap(functions.sendMessage);

      const data = {
        threadId: 'thread123',
        recipientIds: ['user1'],
        content: 'Test message',
        type: 'email',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing required fields', async () => {
      wrapped = testEnv.wrap(functions.sendMessage);

      const data = {
        threadId: 'thread123',
        // missing recipientIds, content, type
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields');
    });

    it('should handle email message type', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        id: 'message456',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendMessage);

      const data = {
        threadId: 'thread123',
        recipientIds: ['user1'],
        content: 'Important update',
        type: 'email',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email',
        })
      );
    });
  });

  describe('sendGroupMessage', () => {
    it('should send message to workgroup members', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          leadUserId: 'lead123',
          workerUserIds: ['worker1', 'worker2'],
        }),
      });
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        get: mockGet,
        id: 'message123',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        workgroupId: 'workgroup123',
        content: 'Team meeting at 3pm',
        type: 'sms',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          workgroupId: 'workgroup123',
          recipientIds: expect.arrayContaining(['lead123', 'worker1', 'worker2']),
        })
      );
    });

    it('should send message to center leads', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          leadUserIds: ['lead1', 'lead2'],
        }),
      });
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        get: mockGet,
        id: 'message456',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        centerId: 'center123',
        content: 'Important announcement',
        type: 'email',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          centerId: 'center123',
          recipientIds: ['lead1', 'lead2'],
        })
      );
    });

    it('should send message to group members', async () => {
      const mockSet = jest.fn().mockResolvedValue(undefined);
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          userIds: ['user1', 'user2', 'user3'],
        }),
      });
      const mockDoc = jest.fn(() => ({
        set: mockSet,
        get: mockGet,
        id: 'message789',
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        groupId: 'group123',
        content: 'Group update',
        type: 'email',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      const result = await wrapped(data, context);

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 'group123',
          recipientIds: ['user1', 'user2', 'user3'],
        })
      );
    });

    it('should throw error when no recipients found', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          leadUserIds: [],
        }),
      });
      const mockDoc = jest.fn(() => ({
        get: mockGet,
      }));

      mockFirestore.collection = jest.fn(() => ({ doc: mockDoc }));

      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        centerId: 'center123',
        content: 'Test message',
        type: 'sms',
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('No recipients found');
    });

    it('should reject without specifying target group/center/workgroup', async () => {
      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        content: 'Test message',
        type: 'sms',
        // missing groupId, centerId, workgroupId
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Must specify at least one of: groupId, centerId, workgroupId');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        groupId: 'group123',
        content: 'Test message',
        type: 'sms',
      };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing content or type', async () => {
      wrapped = testEnv.wrap(functions.sendGroupMessage);

      const data = {
        groupId: 'group123',
        // missing content and type
      };

      const context = {
        auth: { uid: 'sender123', token: {} },
      };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required fields: content, type');
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages for a thread', async () => {
      const messages = [
        { id: 'message1', content: 'Hello', threadId: 'thread123' },
        { id: 'message2', content: 'Hi there', threadId: 'thread123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: messages.map(msg => ({ data: () => msg })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere }));

      wrapped = testEnv.wrap(functions.getMessages);

      const data = { threadId: 'thread123', limit: 100 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(mockWhere).toHaveBeenCalledWith('threadId', '==', 'thread123');
    });

    it('should reject without authentication', async () => {
      wrapped = testEnv.wrap(functions.getMessages);

      const data = { threadId: 'thread123' };

      await expect(wrapped(data, {})).rejects.toThrow('User must be authenticated');
    });

    it('should reject with missing threadId', async () => {
      wrapped = testEnv.wrap(functions.getMessages);

      const data = {};
      const context = { auth: { uid: 'user123', token: {} } };

      await expect(wrapped(data, context)).rejects.toThrow('Missing required field: threadId');
    });

    it('should use custom limit when provided', async () => {
      const messages = [
        { id: 'message1', content: 'Test', threadId: 'thread123' },
      ];

      const mockGet = jest.fn().mockResolvedValue({
        docs: messages.map(msg => ({ data: () => msg })),
      });

      const mockLimit = jest.fn(() => ({ get: mockGet }));
      const mockOrderBy = jest.fn(() => ({ limit: mockLimit }));
      const mockWhere: any = jest.fn(() => ({ orderBy: mockOrderBy }));
      mockFirestore.collection = jest.fn(() => ({ where: mockWhere }));

      wrapped = testEnv.wrap(functions.getMessages);

      const data = { threadId: 'thread123', limit: 50 };
      const context = { auth: { uid: 'user123', token: {} } };

      const result = await wrapped(data, context);

      expect(result.messages).toBeDefined();
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });
});