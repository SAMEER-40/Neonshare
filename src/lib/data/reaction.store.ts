/**
 * Reaction Store
 * Manages likes and reactions on photos.
 */

import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';

export interface Reaction {
    photoId: string;
    userId: string;
    type: 'like';
    createdAt: number;
}

// In-memory cache for reaction counts
const reactionCountCache = new Map<string, number>();
const userReactionsCache = new Map<string, Set<string>>(); // userId -> Set of photoIds

/**
 * Toggle like on a photo
 */
export async function toggleLike(photoId: string, userId: string): Promise<boolean> {
    const reactionRef = doc(db, 'photos', photoId, 'reactions', userId);

    try {
        // Check if already liked - check Firestore directly for accuracy
        const { getDoc } = await import('firebase/firestore');
        const existingDoc = await getDoc(reactionRef);
        const isLiked = existingDoc.exists();

        if (isLiked) {
            // Unlike - remove from Firestore
            await deleteDoc(reactionRef);

            // Update caches
            const userReactions = userReactionsCache.get(userId) || new Set();
            userReactions.delete(photoId);
            userReactionsCache.set(userId, userReactions);

            const currentCount = reactionCountCache.get(photoId) || 1;
            reactionCountCache.set(photoId, Math.max(0, currentCount - 1));

            dispatchReactionEvent(photoId, 'unliked');
            return false; // Not liked anymore
        } else {
            // Like - add to Firestore
            const reaction: Reaction = {
                photoId,
                userId,
                type: 'like',
                createdAt: Date.now()
            };
            await setDoc(reactionRef, reaction);

            // Update caches
            const userReactions = userReactionsCache.get(userId) || new Set();
            userReactions.add(photoId);
            userReactionsCache.set(userId, userReactions);

            const currentCount = reactionCountCache.get(photoId) || 0;
            reactionCountCache.set(photoId, currentCount + 1);

            dispatchReactionEvent(photoId, 'liked');
            return true; // Now liked
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
}

/**
 * Get reaction count for a photo
 */
export async function getReactionCount(photoId: string): Promise<number> {
    // Check cache first
    if (reactionCountCache.has(photoId)) {
        return reactionCountCache.get(photoId)!;
    }

    try {
        const q = query(collection(db, 'photos', photoId, 'reactions'));
        const snapshot = await getDocs(q);
        const count = snapshot.size;
        reactionCountCache.set(photoId, count);
        return count;
    } catch (error) {
        console.error('Error getting reaction count:', error);
        return 0;
    }
}

/**
 * Check if user has liked a photo
 */
export async function hasUserLiked(photoId: string, userId: string): Promise<boolean> {
    // Check cache first
    const userReactions = userReactionsCache.get(userId);
    if (userReactions) {
        return userReactions.has(photoId);
    }

    try {
        const q = query(collection(db, 'photos', photoId, 'reactions'));
        const snapshot = await getDocs(q);

        // Build cache for this user
        const reactions = new Set<string>();
        snapshot.docs.forEach(doc => {
            if (doc.id === userId) {
                reactions.add(photoId);
            }
        });

        return snapshot.docs.some(doc => doc.id === userId);
    } catch (error) {
        console.error('Error checking if user liked:', error);
        return false;
    }
}

/**
 * Load all reactions for a list of photos (batch operation)
 */
export async function loadReactionsForPhotos(
    photoIds: string[],
    userId: string
): Promise<Map<string, { count: number; isLiked: boolean }>> {
    const results = new Map<string, { count: number; isLiked: boolean }>();

    // Load in parallel
    await Promise.all(
        photoIds.map(async (photoId) => {
            try {
                const q = query(collection(db, 'photos', photoId, 'reactions'));
                const snapshot = await getDocs(q);

                const count = snapshot.size;
                const isLiked = snapshot.docs.some(doc => doc.id === userId);

                // Update caches
                reactionCountCache.set(photoId, count);
                if (isLiked) {
                    const userReactions = userReactionsCache.get(userId) || new Set();
                    userReactions.add(photoId);
                    userReactionsCache.set(userId, userReactions);
                }

                results.set(photoId, { count, isLiked });
            } catch {
                results.set(photoId, { count: 0, isLiked: false });
            }
        })
    );

    return results;
}

/**
 * Dispatch custom event for UI updates
 */
function dispatchReactionEvent(photoId: string, action: 'liked' | 'unliked') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('reactionChanged', {
            detail: { photoId, action }
        }));
    }
}

/**
 * Clear reaction caches (for logout)
 */
export function clearReactionCache(): void {
    reactionCountCache.clear();
    userReactionsCache.clear();
}
