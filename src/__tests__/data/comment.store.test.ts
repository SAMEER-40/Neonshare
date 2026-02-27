/**
 * Unit tests for comment.store
 * Tests sanitization, caching, and CRUD operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore functions before importing the store
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db: any, ..._path: string[]) => 'mocked/path');
const mockCollection = vi.fn((_db: any, ..._path: string[]) => 'mocked/collection');
const mockQuery = vi.fn((_col: any, ..._args: any[]) => 'mocked/query');
const mockOrderBy = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: (db: any, ...path: any[]) => mockDoc(db, ...path),
    setDoc: (ref: any, data: any) => mockSetDoc(ref, data),
    deleteDoc: (ref: any) => mockDeleteDoc(ref),
    getDocs: (q: any) => mockGetDocs(q),
    collection: (db: any, ...path: any[]) => mockCollection(db, ...path),
    query: (col: any, ...args: any[]) => mockQuery(col, ...args),
    orderBy: (field: any, dir: any) => mockOrderBy(field, dir),
}));

import { getComments, addComment, deleteComment, clearCommentsCache } from '@/lib/data/comment.store';

describe('comment.store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearCommentsCache();
    });

    describe('addComment', () => {
        it('should sanitize HTML tags from comment text', async () => {
            await addComment('photo1', 'user1', '<script>alert("xss")</script>Hello');

            expect(mockSetDoc).toHaveBeenCalledTimes(1);
            const savedComment = mockSetDoc.mock.calls[0][1];
            expect(savedComment.text).toBe('alert("xss")Hello');
            expect(savedComment.text).not.toContain('<script>');
        });

        it('should truncate comments longer than 500 characters', async () => {
            const longText = 'a'.repeat(600);
            await addComment('photo1', 'user1', longText);

            const savedComment = mockSetDoc.mock.calls[0][1];
            expect(savedComment.text.length).toBe(500);
        });

        it('should reject empty comments after sanitization', async () => {
            const result = await addComment('photo1', 'user1', '   ');
            expect(result).toBeNull();
            expect(mockSetDoc).not.toHaveBeenCalled();
        });

        it('should remove control characters', async () => {
            await addComment('photo1', 'user1', 'Hello\x00\x01\x02World');

            const savedComment = mockSetDoc.mock.calls[0][1];
            expect(savedComment.text).toBe('HelloWorld');
        });

        it('should return the created comment with correct fields', async () => {
            const result = await addComment('photo1', 'user1', 'Nice photo!');

            expect(result).not.toBeNull();
            expect(result!.photoId).toBe('photo1');
            expect(result!.userId).toBe('user1');
            expect(result!.text).toBe('Nice photo!');
            expect(result!.id).toBeDefined();
            expect(result!.timestamp).toBeGreaterThan(0);
        });

        it('should dispatch commentAdded event', async () => {
            const handler = vi.fn();
            window.addEventListener('commentAdded', handler);

            await addComment('photo1', 'user1', 'Test');

            expect(handler).toHaveBeenCalledTimes(1);
            window.removeEventListener('commentAdded', handler);
        });

        it('should invalidate cache after adding a comment', async () => {
            // First, populate cache
            mockGetDocs.mockResolvedValueOnce({
                docs: [{ id: 'c1', data: () => ({ id: 'c1', photoId: 'photo1', userId: 'u1', text: 'Old', timestamp: 1 }) }],
            });
            await getComments('photo1');

            // Add comment invalidates cache
            await addComment('photo1', 'user1', 'New');

            // Next fetch should hit Firestore again (not cache)
            mockGetDocs.mockResolvedValueOnce({
                docs: [
                    { id: 'c1', data: () => ({ id: 'c1', photoId: 'photo1', userId: 'u1', text: 'Old', timestamp: 1 }) },
                    { id: 'c2', data: () => ({ id: 'c2', photoId: 'photo1', userId: 'user1', text: 'New', timestamp: 2 }) },
                ],
            });
            await getComments('photo1');
            expect(mockGetDocs).toHaveBeenCalledTimes(2);
        });

        it('should return null on Firestore error', async () => {
            mockSetDoc.mockRejectedValueOnce(new Error('Network error'));
            const result = await addComment('photo1', 'user1', 'Test');
            expect(result).toBeNull();
        });
    });

    describe('getComments', () => {
        it('should return comments from Firestore', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: [
                    { id: 'c1', data: () => ({ id: 'c1', photoId: 'p1', userId: 'u1', text: 'Hello', timestamp: 100 }) },
                    { id: 'c2', data: () => ({ id: 'c2', photoId: 'p1', userId: 'u2', text: 'World', timestamp: 200 }) },
                ],
            });

            const comments = await getComments('p1');
            expect(comments).toHaveLength(2);
            expect(comments[0].text).toBe('Hello');
            expect(comments[1].text).toBe('World');
        });

        it('should use cache for repeated calls within TTL', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: [{ id: 'c1', data: () => ({ id: 'c1', photoId: 'p1', userId: 'u1', text: 'Cached', timestamp: 100 }) }],
            });

            const first = await getComments('p1');
            const second = await getComments('p1');

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
            expect(first).toEqual(second);
        });

        it('should return empty array on Firestore error', async () => {
            mockGetDocs.mockRejectedValueOnce(new Error('Firestore unavailable'));
            const comments = await getComments('p1');
            expect(comments).toEqual([]);
        });
    });

    describe('deleteComment', () => {
        it('should call deleteDoc with correct path', async () => {
            const result = await deleteComment('photo1', 'comment1');
            expect(result).toBe(true);
            expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
        });

        it('should dispatch commentDeleted event', async () => {
            const handler = vi.fn();
            window.addEventListener('commentDeleted', handler);

            await deleteComment('photo1', 'comment1');

            expect(handler).toHaveBeenCalledTimes(1);
            window.removeEventListener('commentDeleted', handler);
        });

        it('should return false on Firestore error', async () => {
            mockDeleteDoc.mockRejectedValueOnce(new Error('Permission denied'));
            const result = await deleteComment('photo1', 'comment1');
            expect(result).toBe(false);
        });

        it('should invalidate cache after deletion', async () => {
            mockGetDocs.mockResolvedValue({
                docs: [{ id: 'c1', data: () => ({ id: 'c1', photoId: 'photo1', userId: 'u1', text: 'Hello', timestamp: 100 }) }],
            });

            await getComments('photo1'); // populate cache
            await deleteComment('photo1', 'c1'); // invalidate

            await getComments('photo1'); // should re-fetch
            expect(mockGetDocs).toHaveBeenCalledTimes(2);
        });
    });
});
