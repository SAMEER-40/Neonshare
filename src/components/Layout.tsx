'use client';

import React from 'react';
import Link from 'next/link';
import styles from './Layout.module.css';
import { useAuthStatus, useAuthActions } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';
import { prefetchPhotos } from '@/lib/data/photo.store';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user } = useAuthStatus();
    const { logout } = useAuthActions();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Prefetch data on hover for instant navigation
    const handleFeedHover = () => {
        prefetchPhotos();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link
                    href="/"
                    className={styles.logo}
                    onMouseEnter={handleFeedHover}
                    prefetch={true}
                >
                    NeonShare
                </Link>
                {user && (
                    <nav className={styles.controls}>
                        <Link
                            href="/friends"
                            className={styles.navLink}
                            prefetch={true}
                        >
                            Friends
                        </Link>
                        <span className={styles.username}>
                            Welcome, <strong>@{user}</strong>
                        </span>
                        <button
                            onClick={handleLogout}
                            className={styles.logoutBtn}
                        >
                            Logout
                        </button>
                    </nav>
                )}
            </header>
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
