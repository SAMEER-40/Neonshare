/**
 * User Data Store
 * Centralized data ownership for user-related Firestore operations.
 * Implements caching, request deduplication, and read-only selectors.
 */

import { db } from '../firebase';
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';

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

// ============== READ OPERATIONS (Cached) ==============

/**
 * Get a single user by username - uses getDoc for efficiency
 */
export async function getUserByUsername(username: string): Promise<User | null> {
    // Check cache first
    const cached = userCache.get(username);
    if (cached && isCacheValid(cached)) {
        return cached.data;
    }

    return deduplicateRequest(`user:${username}`, async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', username));
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
    return deduplicateRequest(`google:${googleId}`, async () => {
        try {
            const q = query(collection(db, 'users'), where('googleId', '==', googleId));
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
    if (isCacheValid(allUsersCacheRef)) {
        return allUsersCacheRef.data;
    }

    return deduplicateRequest('allUsers', async () => {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
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
    try {
        // Check existence with getDoc (not getAllUsers)
        const existing = await getUserByUsername(user.username);
        if (existing) {
            return { success: false, message: 'Username already exists' };
        }

        await setDoc(doc(db, 'users', user.username), user);

        // Invalidate cache
        userCache.set(user.username, { data: user, timestamp: Date.now() });
        allUsersCacheRef = { data: [], timestamp: 0 }; // Invalidate all users cache

        return { success: true };
    } catch (error: any) {
        console.error('Error registering user:', error);
        return { success: false, message: error.message || 'Registration failed' };
    }
}

/**
 * Add a friend (bidirectional)
 */
export async function addFriend(currentUsername: string, targetUsername: string): Promise<boolean> {
    try {
        // Verify target exists
        const targetUser = await getUserByUsername(targetUsername);
        if (!targetUser) return false;

        await updateDoc(doc(db, 'users', currentUsername), {
            friends: arrayUnion(targetUsername)
        });
        await updateDoc(doc(db, 'users', targetUsername), {
            friends: arrayUnion(currentUsername)
        });

        // Invalidate both users' cache
        userCache.delete(currentUsername);
        userCache.delete(targetUsername);

        return true;
    } catch (error) {
        console.error('Error adding friend:', error);
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
