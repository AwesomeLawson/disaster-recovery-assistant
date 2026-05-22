import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import type { User, RegisterFormData, UserRole } from '../types';

export const userService = {
  // Register user profile after Firebase auth
  async registerUser(data: Omit<RegisterFormData, 'password'>): Promise<User> {
    const registerUserFn = httpsCallable(functions, 'registerUser');
    const result = await registerUserFn(data);
    return (result.data as any).user;
  },

  // Get user by ID
  async getUser(userId: string): Promise<User> {
    const getUserFn = httpsCallable(functions, 'getUser');
    const result = await getUserFn({ userId });
    return (result.data as any).user;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const updateUserProfileFn = httpsCallable(functions, 'updateUserProfile');
    await updateUserProfileFn({ userId, updates });
  },

  // List users with filters
  async listUsers(filters?: {
    role?: UserRole;
    groupId?: string;
    centerId?: string;
    limit?: number;
  }): Promise<User[]> {
    const listUsersFn = httpsCallable(functions, 'listUsers');
    const result = await listUsersFn(filters || {});
    return (result.data as any).users;
  },

  // Approve user role (admin only)
  async approveUserRole(userId: string, approve: boolean, roles?: UserRole[]): Promise<void> {
    const approveUserRoleFn = httpsCallable(functions, 'approveUserRole');
    await approveUserRoleFn({ userId, approve, roles });
  },

  // Get Firebase Auth metadata for a user (admin only)
  async getUserAuthInfo(userId: string): Promise<{ creationTime: string; lastSignInTime: string; providers: string[] }> {
    const fn = httpsCallable(functions, 'getUserAuthInfo');
    const result = await fn({ userId });
    return (result.data as any);
  },

  // Update roles for an already-approved user (admin only)
  async updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
    const fn = httpsCallable(functions, 'updateUserRoles');
    await fn({ userId, roles });
  },

  // Get distinct organization names for typeahead
  async listOrganizations(): Promise<string[]> {
    const fn = httpsCallable(functions, 'listOrganizations');
    const result = await fn({});
    return (result.data as any).organizations;
  },
};
