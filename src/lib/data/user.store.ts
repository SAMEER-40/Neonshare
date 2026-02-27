/**
 * User Data Store
 * Centralized data ownership for user-related Firestore operations.
 * Implements caching, request deduplication, and read-only selectors.
 */

import { db } from '../firebase';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, arrayUnion, writeBatch } from 'firebase/firestore';

// Types
export interface User {
    username: string;
    password?: string;
    friends: string[];
    googleId?: string;
}

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// In-memory cache
const userCache = new Map<string, CacheEntry<User>>();
const allUsersCache: CacheEntry<User[]> | null = { data: [], timestamp: 0 };
let allUsersCacheRef = allUsersCache;

// Request deduplication - track in-flight requests
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate concurrent requests for the same resource
 */
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

/**
 * Check if cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
}

// ============== VALIDATION & SECURITY ==============

/**
 * Hash password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (trimmed.length > 20) {
        return { valid: false, error: 'Username must be 20 characters or less' };
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
    }

    const reserved = ['admin', 'root', 'system', 'moderator', 'mod', 'null', 'undefined'];
    if (reserved.includes(trimmed)) {
        return { valid: false, error: 'This username is reserved' };
    }

    return { valid: true };
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
}

// ============== READ OPERATIONS (Cached) ==============

/**
 * Get a single user by username - uses getDoc for efficiency
 */
export async function getUserByUsername(username: string): Promise<User | null> {
    if (!db) return null;
    // Check cache first
    const cached = userCache.get(username);
    if (cached && isCacheValid(cached)) {
        return cached.data;
    }

    return deduplicateRequest(`user:${username}`, async () => {
        try {
            const userDoc = await getDoc(doc(db as any, 'users', username));
            if (userDoc.exists()) {
                const user = userDoc.data() as User;
                userCache.set(username, { data: user, timestamp: Date.now() });
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    });
}

/**
 * Get user by Google ID
 */
export async function getUserByGoogleId(googleId: string): Promise<User | null> {
    if (!db) return null;
    return deduplicateRequest(`google:${googleId}`, async () => {
        try {
            const q = query(collection(db as any, 'users'), where('googleId', '==', googleId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const user = snapshot.docs[0].data() as User;
                userCache.set(user.username, { data: user, timestamp: Date.now() });
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user by Google ID:', error);
            return null;
        }
    });
}

/**
 * Get all users - cached with TTL
 */
export async function getAllUsers(): Promise<User[]> {
    if (!db) return [];
    if (isCacheValid(allUsersCacheRef)) {
        return allUsersCacheRef.data;
    }

    return deduplicateRequest('allUsers', async () => {
        try {
            const snapshot = await getDocs(collection(db as any, 'users'));
            const users = snapshot.docs.map(d => d.data() as User);

            // Update cache
            allUsersCacheRef = { data: users, timestamp: Date.now() };

            // Also populate individual user cache
            users.forEach(user => {
                userCache.set(user.username, { data: user, timestamp: Date.now() });
            });

            return users;
        } catch (error) {
            console.error('Error fetching all users:', error);
            return [];
        }
    });
}

/**
 * Get friends for a user
 */
export async function getFriends(username: string): Promise<string[]> {
    const user = await getUserByUsername(username);
    return user?.friends ?? [];
}

// ============== WRITE OPERATIONS (Invalidate Cache) ==============

/**
 * Register a new user
 */
export async function registerUser(user: User): Promise<{ success: boolean; message?: string }> {
    if (!db) return { success: false, message: 'Firebase not configured' };
    try {
        // Validate username
        const validation = validateUsername(user.username);
        if (!validation.valid) {
            return { success: false, message: validation.error };
        }

        const normalizedUsername = user.username.trim().toLowerCase();

        // Check existence
        const existing = await getUserByUsername(normalizedUsername);
        if (existing) {
            return { success: false, message: 'Username already exists' };
        }

        // Hash password if provided
        const hashedPassword = user.password ? await hashPassword(user.password) : null;

        // Build user object - Firestore doesn't accept undefined values
        const userToSave: User = {
            username: normalizedUsername,
            friends: user.friends || [],
            ...(hashedPassword && { password: hashedPassword }),
            ...(user.googleId && { googleId: user.googleId })
        };

        await setDoc(doc(db as any, 'users', normalizedUsername), userToSave);

        // Update cache
        userCache.set(normalizedUsername, { data: userToSave, timestamp: Date.now() });
        allUsersCacheRef = { data: [], timestamp: 0 };

        return { success: true };
    } catch (error: any) {
        console.error('Error registering user:', error);
        return { success: false, message: error.message || 'Registration failed' };
    }
}

/**
 * Add a friend (bidirectional, atomic)
 */
export async function addFriend(currentUsername: string, targetUsername: string): Promise<boolean> {
    if (!db) return false;
    try {
        // Verify target exists
        const targetUser = await getUserByUsername(targetUsername);
        if (!targetUser) return false;

        // Prevent self-friending
        if (currentUsername === targetUsername) return false;

        // Use batch write for atomicity
        const batch = writeBatch(db as any);
        batch.update(doc(db as any, 'users', currentUsername), {
            friends: arrayUnion(targetUsername)
        });
        batch.update(doc(db as any, 'users', targetUsername), {
            friends: arrayUnion(currentUsername)
        });
        await batch.commit();

        // Invalidate both users' cache
        userCache.delete(currentUsername);
        userCache.delete(targetUsername);

        return true;
    } catch (error) {
        console.error('Error adding friend:', error);
        return false;
    }
}

/**
 * Remove a friend (bidirectional, atomic)
 */
export async function removeFriend(currentUsername: string, targetUsername: string): Promise<boolean> {
    if (!db) return false;
    try {
        const { arrayRemove } = await import('firebase/firestore');

        // Use batch write for atomicity
        const batch = writeBatch(db as any);
        batch.update(doc(db as any, 'users', currentUsername), {
            friends: arrayRemove(targetUsername)
        });
        batch.update(doc(db as any, 'users', targetUsername), {
            friends: arrayRemove(currentUsername)
        });
        await batch.commit();

        // Invalidate both users' cache
        userCache.delete(currentUsername);
        userCache.delete(targetUsername);

        return true;
    } catch (error) {
        console.error('Error removing friend:', error);
        return false;
    }
}

// ============== CACHE UTILITIES ==============

/**
 * Clear all caches (useful for logout)
 */
export function clearUserCache(): void {
    userCache.clear();
    allUsersCacheRef = { data: [], timestamp: 0 };
}

/**
 * Prefetch user data (for predicted navigation)
 */
export function prefetchUser(username: string): void {
    getUserByUsername(username); // Fire and forget
}
