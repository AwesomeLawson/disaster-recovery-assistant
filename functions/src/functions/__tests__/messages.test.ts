import test from 'firebase-functions-test';

const testEnv = test();

const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockDocRef: any = { id: 'doc123', get: mockGet, set: mockSet, update: mockUpdate };
const mockDoc = jest.fn(() => mockDocRef);
const mockGetAll = jest.fn();

const mockCollectionFn: any = { doc: mockDoc, where: jest.fn(), get: jest.fn() };
const mockFirestore: any = {
  collection: jest.fn(() => mockCollectionFn),
  getAll: mockGetAll,
};

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => mockFirestore),
  initializeApp: jest.fn(),
  apps: ['app'],
}));

import * as functions from '../messages';

const call = (data: any, uid?: string): any =>
  ({ data, auth: uid ? { uid, token: {} } : undefined }) as any;

describe('Message Management Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection = jest.fn(() => mockCollectionFn);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('sendMessage', () => {
    it('rejects unauthenticated requests', async () => {
      const wrapped = testEnv.wrap(functions.sendMessage);
      await expect(wrapped(call({ threadId: 't1', content: 'hi' }))).rejects.toThrow();
    });

    it('rejects missing content', async () => {
      const wrapped = testEnv.wrap(functions.sendMessage);
      await expect(wrapped(call({ threadId: 't1' }, 'user123'))).rejects.toThrow();
    });

    it('rejects when user is not a thread participant', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ participantIds: ['otherUser'], participantNames: {} }),
      });

      const wrapped = testEnv.wrap(functions.sendMessage);
      await expect(wrapped(call({ threadId: 't1', content: 'hi' }, 'user123'))).rejects.toThrow();
    });

    it('sends a message when user is a participant', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          participantIds: ['user123', 'other456'],
          participantNames: { user123: 'Test User', other456: 'Other User' },
        }),
      });

      const wrapped = testEnv.wrap(functions.sendMessage);
      const result = await wrapped(call({ threadId: 't1', content: 'Hello!' }, 'user123'));

      expect(result.message).toBeDefined();
      expect(result.message.content).toBe('Hello!');
      expect(result.message.senderId).toBe('user123');
      expect(mockSet).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('getOrCreateDirectThread', () => {
    it('rejects unauthenticated requests', async () => {
      const wrapped = testEnv.wrap(functions.getOrCreateDirectThread);
      await expect(wrapped(call({ otherUserId: 'u2' }))).rejects.toThrow();
    });

    it('rejects missing otherUserId', async () => {
      const wrapped = testEnv.wrap(functions.getOrCreateDirectThread);
      await expect(wrapped(call({}, 'user123'))).rejects.toThrow();
    });

    it('returns existing thread without creating a new one', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          type: 'direct',
          participantIds: ['user123', 'user456'],
          participantNames: { user123: 'User One', user456: 'User Two' },
          title: 'User Two',
          lastMessageAt: 0,
          lastMessagePreview: '',
          createdAt: 0,
        }),
      });

      const wrapped = testEnv.wrap(functions.getOrCreateDirectThread);
      const result = await wrapped(call({ otherUserId: 'user456' }, 'user123'));

      expect(result.thread).toBeDefined();
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateWorkgroupThread', () => {
    it('rejects unauthenticated requests', async () => {
      const wrapped = testEnv.wrap(functions.getOrCreateWorkgroupThread);
      await expect(wrapped(call({ workgroupId: 'wg1' }))).rejects.toThrow();
    });

    it('rejects missing workgroupId', async () => {
      const wrapped = testEnv.wrap(functions.getOrCreateWorkgroupThread);
      await expect(wrapped(call({}, 'user123'))).rejects.toThrow();
    });
  });

  describe('getReachableContacts', () => {
    it('rejects unauthenticated requests', async () => {
      const wrapped = testEnv.wrap(functions.getReachableContacts);
      await expect(wrapped(call({}))).rejects.toThrow();
    });
  });
});
