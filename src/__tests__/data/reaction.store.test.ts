/**
 * Unit tests for reaction.store
 * Tests like/unlike toggle, caching, and batch loading.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db: any, ..._path: string[]) => 'mocked/path');
const mockCollection = vi.fn((_db: any, ..._path: string[]) => 'mocked/collection');
const mockQuery = vi.fn((_col: any, ..._args: any[]) => 'mocked/query');

vi.mock('firebase/firestore', () => ({
    doc: (db: any, ...path: any[]) => mockDoc(db, ...path),
    setDoc: (ref: any, data: any) => mockSetDoc(ref, data),
    deleteDoc: (ref: any) => mockDeleteDoc(ref),
    getDoc: (ref: any) => mockGetDoc(ref),
    getDocs: (q: any) => mockGetDocs(q),
    collection: (db: any, ...path: any[]) => mockCollection(db, ...path),
    query: (col: any, ...args: any[]) => mockQuery(col, ...args),
}));

import {
    toggleLike,
    getReactionCount,
    hasUserLiked,
    loadReactionsForPhotos,
    clearReactionCache,
} from '@/lib/data/reaction.store';

describe('reaction.store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearReactionCache();
    });

    describe('toggleLike', () => {
        it('should like a photo when not already liked', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });

            const result = await toggleLike('photo1', 'user1');

            expect(result).toBe(true); // Now liked
            expect(mockSetDoc).toHaveBeenCalledTimes(1);
        });

        it('should unlike a photo when already liked', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => true });

            const result = await toggleLike('photo1', 'user1');

            expect(result).toBe(false); // No longer liked
            expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
        });

        it('should update reaction count cache on like', async () => {
            mockGetDoc.mockResolvedValueOnce({ exists: () => false });
            await toggleLike('photo1', 'user1');

            // Count should be cached as 1
            const count = await getReactionCount('photo1');
            expect(count).toBe(1);
        });

        it('should update reaction count cache on unlike', async () => {
            // Set initial count to 2
            mockGetDocs.mockResolvedValueOnce({ size: 2, docs: [] });
            await getReactionCount('photo1');

            // Unlike
            mockGetDoc.mockResolvedValueOnce({ exists: () => true });
            await toggleLike('photo1', 'user1');

            const count = await getReactionCount('photo1');
            expect(count).toBe(1);
        });

        it('should dispatch reactionChanged event', async () => {
            const handler = vi.fn();
            window.addEventListener('reactionChanged', handler);

            mockGetDoc.mockResolvedValueOnce({ exists: () => false });
            await toggleLike('photo1', 'user1');

            expect(handler).toHaveBeenCalledTimes(1);
            window.removeEventListener('reactionChanged', handler);
        });

        it('should throw on Firestore error', async () => {
            mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

            await expect(toggleLike('photo1', 'user1')).rejects.toThrow('Network error');
        });
    });

    describe('getReactionCount', () => {
        it('should fetch count from Firestore', async () => {
            mockGetDocs.mockResolvedValueOnce({ size: 5, docs: [] });

            const count = await getReactionCount('photo1');
            expect(count).toBe(5);
        });

        it('should cache reaction count', async () => {
            mockGetDocs.mockResolvedValueOnce({ size: 3, docs: [] });

            await getReactionCount('photo1');
            const count = await getReactionCount('photo1');

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
            expect(count).toBe(3);
        });

        it('should return 0 on error', async () => {
            mockGetDocs.mockRejectedValueOnce(new Error('Failed'));
            const count = await getReactionCount('photo1');
            expect(count).toBe(0);
        });
    });

    describe('hasUserLiked', () => {
        it('should return true if user has liked the photo', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: [{ id: 'user1' }, { id: 'user2' }],
            });

            const result = await hasUserLiked('photo1', 'user1');
            expect(result).toBe(true);
        });

        it('should return false if user has not liked the photo', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: [{ id: 'user2' }],
            });

            const result = await hasUserLiked('photo1', 'user1');
            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            mockGetDocs.mockRejectedValueOnce(new Error('Failed'));
            const result = await hasUserLiked('photo1', 'user1');
            expect(result).toBe(false);
        });
    });

    describe('loadReactionsForPhotos', () => {
        it('should load reactions for multiple photos in parallel', async () => {
            mockGetDocs
                .mockResolvedValueOnce({ size: 3, docs: [{ id: 'user1' }] })
                .mockResolvedValueOnce({ size: 1, docs: [{ id: 'user2' }] });

            const results = await loadReactionsForPhotos(['p1', 'p2'], 'user1');

            expect(results.get('p1')).toEqual({ count: 3, isLiked: true });
            expect(results.get('p2')).toEqual({ count: 1, isLiked: false });
        });

        it('should handle errors gracefully per photo', async () => {
            mockGetDocs
                .mockResolvedValueOnce({ size: 2, docs: [{ id: 'user1' }] })
                .mockRejectedValueOnce(new Error('Failed'));

            const results = await loadReactionsForPhotos(['p1', 'p2'], 'user1');

            expect(results.get('p1')).toEqual({ count: 2, isLiked: true });
            expect(results.get('p2')).toEqual({ count: 0, isLiked: false });
        });

        it('should update caches for loaded photos', async () => {
            mockGetDocs.mockResolvedValueOnce({ size: 5, docs: [{ id: 'user1' }] });

            await loadReactionsForPhotos(['p1'], 'user1');

            // Should be cached now
            const count = await getReactionCount('p1');
            expect(count).toBe(5);
            expect(mockGetDocs).toHaveBeenCalledTimes(1); // No extra fetch
        });
    });
});
