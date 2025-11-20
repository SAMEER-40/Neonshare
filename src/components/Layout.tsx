'use client';

import React from 'react';
import styles from './Layout.module.css';
import { useUser } from '@/lib/useUser';
import { useRouter } from 'next/navigation';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useUser();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>NeonShare</div>
                {user && (
                    <div className={styles.controls}>
                        <a href="/friends" style={{ marginRight: '1rem', textDecoration: 'underline' }}>Friends</a>
                        <span>Welcome, <strong>@{user}</strong></span>
                        <button
                            onClick={handleLogout}
                            className={styles.logoutBtn}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
