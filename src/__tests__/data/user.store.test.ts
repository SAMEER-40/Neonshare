/**
 * Unit tests for user.store
 * Tests validation, caching, deduplication, and friend operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn((_db: any, ..._path: string[]) => 'mocked/path');
const mockCollection = vi.fn((_db: any, ..._path: string[]) => 'mocked/collection');
const mockQuery = vi.fn((_col: any, ..._args: any[]) => 'mocked/query');
const mockWhere = vi.fn();
const mockArrayUnion = vi.fn((val: string) => `__arrayUnion:${val}`);
const mockArrayRemove = vi.fn((val: string) => `__arrayRemove:${val}`);
const mockWriteBatch = vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
    doc: (db: any, ...path: any[]) => mockDoc(db, ...path),
    getDoc: (ref: any) => mockGetDoc(ref),
    getDocs: (q: any) => mockGetDocs(q),
    setDoc: (ref: any, data: any) => mockSetDoc(ref, data),
    updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
    collection: (db: any, ...path: any[]) => mockCollection(db, ...path),
    query: (col: any, ...args: any[]) => mockQuery(col, ...args),
    where: (field: any, op: any, val: any) => mockWhere(field, op, val),
    arrayUnion: (val: any) => mockArrayUnion(val),
    arrayRemove: (val: any) => mockArrayRemove(val),
    writeBatch: (_db?: any) => mockWriteBatch(),
}));

import {
    validateUsername,
    getUserByUsername,
    registerUser,
    addFriend,
    clearUserCache,
} from '@/lib/data/user.store';

describe('user.store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearUserCache();
    });

    describe('validateUsername', () => {
        it('should accept valid usernames', () => {
            expect(validateUsername('alice')).toEqual({ valid: true });
            expect(validateUsername('bob_123')).toEqual({ valid: true });
            expect(validateUsername('a_b')).toEqual({ valid: true });
        });

        it('should reject usernames shorter than 3 characters', () => {
            const result = validateUsername('ab');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 3');
        });

        it('should reject usernames longer than 20 characters', () => {
            const result = validateUsername('a'.repeat(21));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('20 characters');
        });

        it('should reject usernames with special characters', () => {
            expect(validateUsername('alice@bob').valid).toBe(false);
            expect(validateUsername('hello world').valid).toBe(false);
            expect(validateUsername('user.name').valid).toBe(false);
            expect(validateUsername('user-name').valid).toBe(false);
        });

        it('should reject reserved usernames', () => {
            expect(validateUsername('admin').valid).toBe(false);
            expect(validateUsername('root').valid).toBe(false);
            expect(validateUsername('system').valid).toBe(false);
            expect(validateUsername('moderator').valid).toBe(false);
            expect(validateUsername('null').valid).toBe(false);
            expect(validateUsername('undefined').valid).toBe(false);
        });

        it('should be case-insensitive for reserved words', () => {
            expect(validateUsername('ADMIN').valid).toBe(false);
            expect(validateUsername('Admin').valid).toBe(false);
        });

        it('should trim whitespace', () => {
            expect(validateUsername('  alice  ')).toEqual({ valid: true });
        });

        it('should only allow lowercase letters, numbers, underscores (after normalization)', () => {
            // Uppercase is accepted because validateUsername normalizes to lowercase first
            expect(validateUsername('ALICE').valid).toBe(true);
            expect(validateUsername('alice123').valid).toBe(true);
            expect(validateUsername('_test_').valid).toBe(true);
            // Special chars are still rejected even after lowercasing
            expect(validateUsername('alice!').valid).toBe(false);
            expect(validateUsername('alice spaces').valid).toBe(false);
        });
    });

    describe('getUserByUsername', () => {
        it('should return user data from Firestore', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: ['bob'] }),
            });

            const user = await getUserByUsername('alice');
            expect(user).not.toBeNull();
            expect(user!.username).toBe('alice');
            expect(user!.friends).toEqual(['bob']);
        });

        it('should return null for non-existent user', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => false,
            });

            const user = await getUserByUsername('nonexistent');
            expect(user).toBeNull();
        });

        it('should cache user data', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: [] }),
            });

            await getUserByUsername('alice');
            await getUserByUsername('alice');

            expect(mockGetDoc).toHaveBeenCalledTimes(1);
        });

        it('should deduplicate concurrent requests', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: [] }),
            });

            const [r1, r2] = await Promise.all([
                getUserByUsername('alice'),
                getUserByUsername('alice'),
            ]);

            expect(mockGetDoc).toHaveBeenCalledTimes(1);
            expect(r1).toEqual(r2);
        });

        it('should return null on Firestore error', async () => {
            mockGetDoc.mockRejectedValueOnce(new Error('Network error'));
            const user = await getUserByUsername('alice');
            expect(user).toBeNull();
        });
    });

    describe('registerUser', () => {
        it('should validate username before registering', async () => {
            const result = await registerUser({ username: 'ab', friends: [] });
            expect(result.success).toBe(false);
            expect(result.message).toContain('at least 3');
            expect(mockSetDoc).not.toHaveBeenCalled();
        });

        it('should reject reserved usernames', async () => {
            const result = await registerUser({ username: 'admin', friends: [] });
            expect(result.success).toBe(false);
            expect(result.message).toContain('reserved');
        });

        it('should check for existing username', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: [] }),
            });

            const result = await registerUser({ username: 'alice', friends: [] });
            expect(result.success).toBe(false);
            expect(result.message).toContain('already exists');
        });

        it('should normalize username to lowercase', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });

            await registerUser({ username: '  Alice  ', password: 'pass123', friends: [] });

            const savedUser = mockSetDoc.mock.calls[0][1];
            expect(savedUser.username).toBe('alice');
        });

        it('should hash password before saving', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });

            await registerUser({ username: 'newuser', password: 'mypassword', friends: [] });

            const savedUser = mockSetDoc.mock.calls[0][1];
            expect(savedUser.password).toBeDefined();
            expect(savedUser.password).not.toBe('mypassword'); // Should be hashed
        });

        it('should return success for valid registration', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });

            const result = await registerUser({ username: 'newuser', password: 'pass', friends: [] });
            expect(result.success).toBe(true);
        });
    });

    describe('addFriend', () => {
        it('should prevent self-friending', async () => {
            const result = await addFriend('alice', 'alice');
            expect(result).toBe(false);
        });

        it('should check if target user exists', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });

            const result = await addFriend('alice', 'nonexistent');
            expect(result).toBe(false);
        });

        it('should use batch write for atomic bidirectional update', async () => {
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'bob', friends: [] }),
            });

            const result = await addFriend('alice', 'bob');

            expect(result).toBe(true);
            expect(mockWriteBatch).toHaveBeenCalledTimes(1);
        });

        it('should invalidate caches for both users', async () => {
            // Pre-populate cache for alice
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: [] }),
            });
            await getUserByUsername('alice');

            // Now add friend (mock bob exists)
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'bob', friends: [] }),
            });
            await addFriend('alice', 'bob');

            // Next call should re-fetch from Firestore (cache invalidated)
            mockGetDoc.mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ username: 'alice', friends: ['bob'] }),
            });
            const user = await getUserByUsername('alice');

            expect(mockGetDoc).toHaveBeenCalledTimes(3);
            expect(user!.friends).toContain('bob');
        });
    });
});
