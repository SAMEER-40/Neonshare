'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useUser } from '@/lib/useUser';
import { storage } from '@/lib/storage';

export default function CompleteProfilePage() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();
    const { register, user } = useUser();

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

        const pendingAuth = JSON.parse(pendingAuthJson);

        // Register with googleId
        const newUser = {
            username,
            friends: [],
            googleId: pendingAuth.uid
        };

        const result = await storage.registerUser(newUser);
        if (result.success) {
            storage.setCurrentUser(username);
            localStorage.removeItem('photo_share_pending_google_auth');
            // Trigger user change event
            window.dispatchEvent(new Event('userChanged'));
            router.push('/');
        } else {
            setError(result.message || 'Registration failed');
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
                        <label className={styles.label}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={styles.input}
                            placeholder="e.g. neon_rider"
                            required
                        />
                    </div>

                    <button type="submit" className={styles.submit}>
                        Complete Profile
                    </button>
                </form>
            </div>
        </div>
    );
}
