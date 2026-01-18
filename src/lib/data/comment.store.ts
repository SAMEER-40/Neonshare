/**
 * Comment Data Store
 * Manages comments on photos using Firestore subcollections.
 */

import { db } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export interface Comment {
    id: string;
    photoId: string;
    userId: string;
    text: string;
    timestamp: number;
}

// In-memory cache for comments
const commentsCache = new Map<string, { data: Comment[]; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute
const MAX_COMMENT_LENGTH = 500;

/**
 * Sanitize comment text
 */
function sanitizeCommentText(text: string): string {
    return text
        .trim()
        .slice(0, MAX_COMMENT_LENGTH)
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove control chars
}

function isCacheValid(photoId: string): boolean {
    const cached = commentsCache.get(photoId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_TTL;
}

/**
 * Get all comments for a photo
 */
export async function getComments(photoId: string): Promise<Comment[]> {
    // Check cache
    if (isCacheValid(photoId)) {
        return commentsCache.get(photoId)!.data;
    }

    try {
        const q = query(
            collection(db, 'photos', photoId, 'comments'),
            orderBy('timestamp', 'asc')
        );
        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        } as Comment));

        // Update cache
        commentsCache.set(photoId, { data: comments, timestamp: Date.now() });

        return comments;
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}

/**
 * Add a comment to a photo
 */
export async function addComment(
    photoId: string,
    userId: string,
    text: string
): Promise<Comment | null> {
    const sanitizedText = sanitizeCommentText(text);
    if (!sanitizedText) return null;

    const commentId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const comment: Comment = {
        id: commentId,
        photoId,
        userId,
        text: sanitizedText,
        timestamp: Date.now()
    };

    try {
        await setDoc(doc(db, 'photos', photoId, 'comments', commentId), comment);

        // Invalidate cache
        commentsCache.delete(photoId);

        // Dispatch event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('commentAdded', { detail: comment }));
        }

        return comment;
    } catch (error) {
        console.error('Error adding comment:', error);
        return null;
    }
}

/**
 * Delete a comment
 * Server-side Firestore rules enforce ownership
 */
export async function deleteComment(
    photoId: string,
    commentId: string
): Promise<boolean> {
    try {
        await deleteDoc(doc(db, 'photos', photoId, 'comments', commentId));

        // Invalidate cache
        commentsCache.delete(photoId);

        // Dispatch event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('commentDeleted', { detail: { photoId, commentId } }));
        }

        return true;
    } catch (error) {
        console.error('Error deleting comment:', error);
        return false;
    }
}

/**
 * Clear comments cache (for logout)
 */
export function clearCommentsCache(): void {
    commentsCache.clear();
}
