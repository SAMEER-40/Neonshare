/**
 * AuthProvider
 * Non-blocking authentication context.
 * Renders layout immediately, provides auth status for gating protected sections.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getUserByUsername, getUserByGoogleId, registerUser, addFriend, clearUserCache, User } from './data/user.store';

// Types
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
    user: string | null;
    authStatus: AuthStatus;
    friends: string[];
    login: (username: string, password?: string) => Promise<boolean>;
    register: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
    loginWithGoogle: () => Promise<boolean>;
    addFriend: (targetUsername: string) => Promise<boolean>;
    refreshFriends: () => Promise<void>;
}

const STORAGE_KEY = 'photo_share_current_user';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
    const [friends, setFriends] = useState<string[]>([]);

    // Initialize auth state from localStorage (non-blocking)
    useEffect(() => {
        const storedUser = localStorage.getItem(STORAGE_KEY);
        if (storedUser) {
            setUser(storedUser);
            setAuthStatus('authenticated');
            // Fetch friends in background
            getUserByUsername(storedUser).then(userData => {
                if (userData) setFriends(userData.friends);
            });
        } else {
            setAuthStatus('unauthenticated');
        }
    }, []);

    const refreshFriends = useCallback(async () => {
        if (!user) return;
        const userData = await getUserByUsername(user);
        if (userData) setFriends(userData.friends);
    }, [user]);

    const login = useCallback(async (username: string, password?: string): Promise<boolean> => {
        const userData = await getUserByUsername(username);
        if (userData && (userData.password === password || userData.googleId)) {
            localStorage.setItem(STORAGE_KEY, username);
            setUser(username);
            setAuthStatus('authenticated');
            setFriends(userData.friends);
            window.dispatchEvent(new Event('userChanged'));
            return true;
        }
        return false;
    }, []);

    const register = useCallback(async (username: string, password?: string) => {
        const newUser: User = { username, password, friends: [] };
        const result = await registerUser(newUser);
        if (result.success) {
            localStorage.setItem(STORAGE_KEY, username);
            setUser(username);
            setAuthStatus('authenticated');
            setFriends([]);
            window.dispatchEvent(new Event('userChanged'));
        }
        return result;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setAuthStatus('unauthenticated');
        setFriends([]);
        clearUserCache();
        window.dispatchEvent(new Event('userChanged'));
    }, []);

    const loginWithGoogle = useCallback(async (): Promise<boolean> => {
        try {
            const { auth, googleProvider } = await import('./firebase');
            const { signInWithPopup } = await import('firebase/auth');

            const result = await signInWithPopup(auth, googleProvider);
            const googleUser = result.user;

            const existingUser = await getUserByGoogleId(googleUser.uid);
            if (existingUser) {
                localStorage.setItem(STORAGE_KEY, existingUser.username);
                setUser(existingUser.username);
                setAuthStatus('authenticated');
                setFriends(existingUser.friends);
                window.dispatchEvent(new Event('userChanged'));
                return true;
            } else {
                // Store pending auth for profile completion
                localStorage.setItem('photo_share_pending_google_auth', JSON.stringify({
                    uid: googleUser.uid,
                    email: googleUser.email
                }));
                return true;
            }
        } catch (error) {
            console.error('Google Sign-In Error:', error);
            return false;
        }
    }, []);

    const handleAddFriend = useCallback(async (targetUsername: string): Promise<boolean> => {
        if (!user) return false;
        const success = await addFriend(user, targetUsername);
        if (success) await refreshFriends();
        return success;
    }, [user, refreshFriends]);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        user,
        authStatus,
        friends,
        login,
        register,
        logout,
        loginWithGoogle,
        addFriend: handleAddFriend,
        refreshFriends
    }), [user, authStatus, friends, login, register, logout, loginWithGoogle, handleAddFriend, refreshFriends]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// ============== HOOKS ==============

/**
 * Read-only auth selector (minimal re-renders)
 */
export function useAuthStatus() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthStatus must be used within AuthProvider');
    return { user: ctx.user, authStatus: ctx.authStatus, friends: ctx.friends };
}

/**
 * Auth actions (mutations only)
 */
export function useAuthActions() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuthActions must be used within AuthProvider');
    return {
        login: ctx.login,
        register: ctx.register,
        logout: ctx.logout,
        loginWithGoogle: ctx.loginWithGoogle,
        addFriend: ctx.addFriend,
        refreshFriends: ctx.refreshFriends
    };
}

/**
 * Full auth context (for backwards compatibility)
 */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
