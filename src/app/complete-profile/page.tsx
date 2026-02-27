'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuthStatus } from '@/lib/AuthProvider';
import { registerUser, User } from '@/lib/data/user.store';

export default function CompleteProfilePage() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { user } = useAuthStatus();

    useEffect(() => {
        // If already logged in with a full account, redirect home
        if (user && !localStorage.getItem('photo_share_pending_google_auth')) {
            router.push('/');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        // Check if pending google auth exists
        const pendingAuthJson = localStorage.getItem('photo_share_pending_google_auth');
        if (!pendingAuthJson) {
            router.push('/login');
            return;
        }

        setIsLoading(true);
        const pendingAuth = JSON.parse(pendingAuthJson);

        // Register with googleId
        const newUser: User = {
            username,
            friends: [],
            googleId: pendingAuth.uid
        };

        const result = await registerUser(newUser);
        if (result.success) {
            localStorage.setItem('photo_share_current_user', username);
            localStorage.removeItem('photo_share_pending_google_auth');
            window.dispatchEvent(new Event('userChanged'));
            router.push('/');
        } else {
            setError(result.message || 'Registration failed');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Almost There!</h1>
                <p className={styles.subtitle}>Choose a username to complete your profile.</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.field}>
                        <label htmlFor="complete-profile-username" className={styles.label}>Username</label>
                        <input
                            id="complete-profile-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.input}
                            placeholder="e.g. neon_rider"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className={styles.submit} disabled={isLoading}>
                        {isLoading ? <span className="loading-spinner" /> : 'Complete Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
