/**
 * Unit tests for photo.store
 * Tests search, visibility filtering, caching, and CRUD.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firestore
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db: any, ..._path: string[]) => 'mocked/path');
const mockCollection = vi.fn((_db: any, ..._path: string[]) => 'mocked/collection');
const mockQuery = vi.fn((_col: any, ..._args: any[]) => 'mocked/query');
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockStartAfter = vi.fn();

vi.mock('firebase/firestore', () => ({
    doc: (db: any, ...path: any[]) => mockDoc(db, ...path),
    setDoc: (ref: any, data: any) => mockSetDoc(ref, data),
    getDocs: (q: any) => mockGetDocs(q),
    collection: (db: any, ...path: any[]) => mockCollection(db, ...path),
    query: (col: any, ...args: any[]) => mockQuery(col, ...args),
    orderBy: (field: any, dir: any) => mockOrderBy(field, dir),
    limit: (n: any) => mockLimit(n),
    startAfter: (doc: any) => mockStartAfter(doc),
}));

import {
    getAllPhotos,
    getVisiblePhotos,
    searchPhotos,
    savePhoto,
    invalidatePhotoCache,
    type Photo,
} from '@/lib/data/photo.store';

const mockPhotos: Photo[] = [
    { id: 'p1', url: 'url1', uploader: 'alice', tags: ['bob', 'charlie'], timestamp: 300 },
    { id: 'p2', url: 'url2', uploader: 'bob', tags: ['alice'], timestamp: 200 },
    { id: 'p3', url: 'url3', uploader: 'charlie', tags: [], timestamp: 100 },
];

describe('photo.store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidatePhotoCache();
    });

    describe('getAllPhotos', () => {
        it('should fetch and sort photos by timestamp descending', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: mockPhotos.map(p => ({ data: () => p })),
            });

            const photos = await getAllPhotos();

            expect(photos).toHaveLength(3);
            expect(photos[0].id).toBe('p1'); // timestamp 300 first
            expect(photos[1].id).toBe('p2'); // timestamp 200
            expect(photos[2].id).toBe('p3'); // timestamp 100
        });

        it('should cache results and not re-fetch within TTL', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: mockPhotos.map(p => ({ data: () => p })),
            });

            await getAllPhotos();
            await getAllPhotos();

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
        });

        it('should return empty array on error', async () => {
            mockGetDocs.mockRejectedValueOnce(new Error('Network error'));
            const photos = await getAllPhotos();
            expect(photos).toEqual([]);
        });

        it('should deduplicate concurrent requests', async () => {
            mockGetDocs.mockResolvedValueOnce({
                docs: mockPhotos.map(p => ({ data: () => p })),
            });

            // Fire two requests simultaneously
            const [result1, result2] = await Promise.all([
                getAllPhotos(),
                getAllPhotos(),
            ]);

            expect(mockGetDocs).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });
    });

    describe('getVisiblePhotos', () => {
        beforeEach(() => {
            mockGetDocs.mockResolvedValueOnce({
                docs: mockPhotos.map(p => ({ data: () => p })),
            });
        });

        it('should return photos uploaded by the user', async () => {
            const photos = await getVisiblePhotos('alice');
            const ids = photos.map(p => p.id);
            expect(ids).toContain('p1'); // alice uploaded p1
        });

        it('should return photos where user is tagged', async () => {
            const photos = await getVisiblePhotos('bob');
            const ids = photos.map(p => p.id);
            expect(ids).toContain('p1'); // bob tagged in p1
            expect(ids).toContain('p2'); // bob uploaded p2
        });

        it('should not return unrelated photos', async () => {
            const photos = await getVisiblePhotos('charlie');
            const ids = photos.map(p => p.id);
            expect(ids).toContain('p1'); // charlie tagged in p1
            expect(ids).toContain('p3'); // charlie uploaded p3
            expect(ids).not.toContain('p2'); // charlie not tagged in p2 and didn't upload it
        });

        it('should return empty for unknown user', async () => {
            const photos = await getVisiblePhotos('nobody');
            expect(photos).toHaveLength(0);
        });
    });

    describe('searchPhotos', () => {
        it('should find photos by uploader username', () => {
            const results = searchPhotos(mockPhotos, 'alice');
            expect(results.map(p => p.id)).toContain('p1');
            expect(results.map(p => p.id)).toContain('p2'); // alice tagged
        });

        it('should find photos by tag', () => {
            const results = searchPhotos(mockPhotos, 'bob');
            expect(results.map(p => p.id)).toContain('p1'); // bob is a tag
            expect(results.map(p => p.id)).toContain('p2'); // bob is uploader
        });

        it('should be case-insensitive', () => {
            const results = searchPhotos(mockPhotos, 'ALICE');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should strip @ prefix from query', () => {
            const results = searchPhotos(mockPhotos, '@alice');
            expect(results.length).toBeGreaterThan(0);
        });

        it('should return all photos for empty query', () => {
            const results = searchPhotos(mockPhotos, '');
            expect(results).toEqual(mockPhotos);
        });

        it('should return all photos for whitespace-only query', () => {
            const results = searchPhotos(mockPhotos, '   ');
            expect(results).toEqual(mockPhotos);
        });

        it('should return empty for non-matching query', () => {
            const results = searchPhotos(mockPhotos, 'nonexistent');
            expect(results).toHaveLength(0);
        });

        it('should match partial usernames', () => {
            const results = searchPhotos(mockPhotos, 'ali');
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('savePhoto', () => {
        it('should save photo and invalidate cache', async () => {
            const photo: Photo = {
                id: 'new1', url: 'newurl', uploader: 'alice', tags: [], timestamp: Date.now(),
            };

            const result = await savePhoto(photo);

            expect(result).toBe(true);
            expect(mockSetDoc).toHaveBeenCalledTimes(1);
        });

        it('should dispatch photoUploaded event', async () => {
            const handler = vi.fn();
            window.addEventListener('photoUploaded', handler);

            await savePhoto({
                id: 'new1', url: 'url', uploader: 'alice', tags: [], timestamp: Date.now(),
            });

            expect(handler).toHaveBeenCalledTimes(1);
            window.removeEventListener('photoUploaded', handler);
        });

        it('should return false on Firestore error', async () => {
            mockSetDoc.mockRejectedValueOnce(new Error('Quota exceeded'));
            const result = await savePhoto({
                id: 'new1', url: 'url', uploader: 'alice', tags: [], timestamp: Date.now(),
            });
            expect(result).toBe(false);
        });
    });
});
