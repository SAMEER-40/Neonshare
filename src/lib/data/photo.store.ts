/**
 * Photo Data Store
 * Centralized data ownership for photo-related Firestore operations.
 * Implements caching, request deduplication, and optimized queries.
 */

import { db } from '../firebase';
import { doc, getDocs, collection, setDoc, query, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';

// Types
export interface Photo {
    id: string;
    url: string;
    uploader: string;
    tags: string[];
    timestamp: number;
    pending?: boolean;
    deleted?: boolean;
}

// Cache configuration
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for photos (more dynamic)
const PAGE_SIZE = 20;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// In-memory cache
let photosCache: CacheEntry<Photo[]> | null = null;

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

function deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }

    const promise = fetcher().finally(() => {
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
}

// ============== READ OPERATIONS ==============

/**
 * Get all photos (cached)
 */
export async function getAllPhotos(): Promise<Photo[]> {
    if (isCacheValid(photosCache)) {
        return photosCache!.data;
    }

    return deduplicateRequest('allPhotos', async () => {
        try {
            const snapshot = await getDocs(collection(db, 'photos'));
            const photos = snapshot.docs
                .map(d => d.data() as Photo)
                .sort((a, b) => b.timestamp - a.timestamp);

            photosCache = { data: photos, timestamp: Date.now() };
            return photos;
        } catch (error) {
            console.error('Error fetching photos:', error);
            return [];
        }
    });
}

/**
 * Get photos visible to a specific user
 * Filters by: uploader === user OR user in tags
 */
export async function getVisiblePhotos(username: string): Promise<Photo[]> {
    const allPhotos = await getAllPhotos();
    return allPhotos.filter(photo =>
        photo.uploader === username || photo.tags.includes(username)
    );
}

/**
 * Search photos by uploader or tag
 */
export function searchPhotos(photos: Photo[], query: string): Photo[] {
    const normalizedQuery = query.toLowerCase().trim().replace(/^@/, '');
    if (!normalizedQuery) return photos;

    return photos.filter(photo => {
        // Match uploader
        if (photo.uploader.toLowerCase().includes(normalizedQuery)) return true;
        // Match any tag
        if (photo.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))) return true;
        return false;
    });
}

/**
 * Paginated photo fetch (for infinite scroll)
 */
let lastDoc: DocumentSnapshot | null = null;

export async function getPhotosPaginated(reset: boolean = false): Promise<Photo[]> {
    if (reset) lastDoc = null;

    try {
        let q = query(
            collection(db, 'photos'),
            orderBy('timestamp', 'desc'),
            limit(PAGE_SIZE)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }

        return snapshot.docs.map(d => d.data() as Photo);
    } catch (error) {
        console.error('Error fetching paginated photos:', error);
        return [];
    }
}

// ============== WRITE OPERATIONS ==============

/**
 * Save a new photo
 */
export async function savePhoto(photo: Photo): Promise<boolean> {
    try {
        await setDoc(doc(db, 'photos', photo.id), photo);

        // Invalidate cache
        photosCache = null;

        // Dispatch event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoUploaded', { detail: photo }));
        }

        return true;
    } catch (error) {
        console.error('Error saving photo:', error);
        return false;
    }
}

// ============== CACHE UTILITIES ==============

/**
 * Invalidate photo cache (force refresh)
 */
export function invalidatePhotoCache(): void {
    photosCache = null;
}

/**
 * Prefetch photos (for predicted navigation)
 */
export function prefetchPhotos(): void {
    getAllPhotos(); // Fire and forget
}

/**
 * Subscribe to photo updates (for real-time sync)
 */
export function subscribeToPhotoUpdates(callback: (photos: Photo[]) => void): () => void {
    const handler = () => {
        getAllPhotos().then(callback);
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('photoUploaded', handler);
        return () => window.removeEventListener('photoUploaded', handler);
    }

    return () => { };
}
