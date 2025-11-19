import { useState, useEffect } from 'react';
import { storage, User } from './storage';

export function useUser() {
    const [user, setUser] = useState<string | null>(null);
    const [friends, setFriends] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    useEffect(() => {
        const checkUser = async () => {
            const currentUser = storage.getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                const friendList = await storage.getFriends(currentUser);
                setFriends(friendList);
            }
        };
        checkUser();

        const fetchUsers = async () => {
            const users = await storage.getUsers();
            setAvailableUsers(users);
        };
        fetchUsers();

        const handleUserChange = () => {
            checkUser();
            fetchUsers();
        };

        window.addEventListener('userChanged', handleUserChange);
        return () => window.removeEventListener('userChanged', handleUserChange);
    }, []);

    const login = async (username: string, password?: string): Promise<boolean> => {
        const users = await storage.getUsers();
        const foundUser = users.find(u => u.username === username);

        if (foundUser) {
            // For Google users, password might be undefined or placeholder
            if (foundUser.password === password || foundUser.googleId) {
                storage.setCurrentUser(username);
                window.dispatchEvent(new Event('userChanged'));
                return true;
            }
        }
        return false;
    };

    const register = async (username: string, password?: string): Promise<{ success: boolean; message?: string }> => {
        const newUser: User = {
            username,
            password, // Optional
            friends: []
        };

        const result = await storage.registerUser(newUser);
        if (result.success) {
            storage.setCurrentUser(username);
            window.dispatchEvent(new Event('userChanged'));
            return { success: true };
        }
        return result;
    };

    const logout = () => {
        storage.setCurrentUser(null);
        setUser(null);
        setFriends([]);
        window.dispatchEvent(new Event('userChanged'));
    };

    const loginWithGoogle = async (): Promise<boolean> => {
        try {
            const { auth, googleProvider } = await import('./firebase');
            const { signInWithPopup } = await import('firebase/auth');

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in our local storage by googleId
            const existingUser = await storage.getUserByGoogleId(user.uid);

            if (existingUser) {
                // User exists, log them in locally
                storage.setCurrentUser(existingUser.username);
                window.dispatchEvent(new Event('userChanged'));
                return true;
            } else {
                // New user, store pending google auth info
                localStorage.setItem('photo_share_pending_google_auth', JSON.stringify({
                    uid: user.uid,
                    email: user.email
                }));
                return true; // Caller should redirect to /complete-profile
            }
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            return false;
        }
    };

    const addFriend = async (targetUsername: string): Promise<boolean> => {
        if (!user) return false;
        const success = await storage.addFriend(user, targetUsername);
        if (success) {
            // Refresh friends list
            const friendList = await storage.getFriends(user);
            setFriends(friendList);
            return true;
        }
        return false;
    };

    return {
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        addFriend,
        loginWithGoogle,
        friends,
        availableUsers
    };
}
