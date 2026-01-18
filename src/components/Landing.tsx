'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Landing.module.css';
import { useAuthStatus } from '@/lib/AuthProvider';

export default function Landing() {
    const router = useRouter();
    const { authStatus } = useAuthStatus();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animations after mount
        setIsVisible(true);

        // If already authenticated, redirect to home
        if (authStatus === 'authenticated') {
            router.push('/home');
        }
    }, [authStatus, router]);

    const handleGetStarted = () => {
        router.push('/register');
    };

    const handleLogin = () => {
        router.push('/login');
    };

    return (
        <div className={styles.container}>
            {/* Animated background */}
            <div className={styles.bgGradient} />
            <div className={styles.bgOrbs}>
                <div className={styles.orb1} />
                <div className={styles.orb2} />
                <div className={styles.orb3} />
            </div>

            {/* Hero Section */}
            <main className={`${styles.hero} ${isVisible ? styles.visible : ''}`}>
                <div className={styles.badge}>
                    <span className={styles.badgeIcon}>✨</span>
                    <span>Share Moments That Matter</span>
                </div>

                <h1 className={styles.title}>
                    <span className={styles.titleLine1}>Capture.</span>
                    <span className={styles.titleLine2}>Share.</span>
                    <span className={styles.titleLine3}>Connect.</span>
                </h1>

                <p className={styles.subtitle}>
                    A beautifully crafted photo-sharing experience for you and your closest friends.
                    No algorithms. No ads. Just pure memories.
                </p>

                <div className={styles.cta}>
                    <button className={styles.primaryBtn} onClick={handleGetStarted}>
                        <span>Get Started</span>
                        <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                    <button className={styles.secondaryBtn} onClick={handleLogin}>
                        I already have an account
                    </button>
                </div>

                {/* Feature highlights */}
                <div className={styles.features}>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>🔒</div>
                        <span>Private by default</span>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>👥</div>
                        <span>Friends only</span>
                    </div>
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>⚡</div>
                        <span>Lightning fast</span>
                    </div>
                </div>
            </main>

            {/* Floating photo previews */}
            <div className={styles.floatingPhotos}>
                <div className={`${styles.floatingPhoto} ${styles.photo1}`}>
                    <div className={styles.photoPlaceholder}>📸</div>
                </div>
                <div className={`${styles.floatingPhoto} ${styles.photo2}`}>
                    <div className={styles.photoPlaceholder}>🏔️</div>
                </div>
                <div className={`${styles.floatingPhoto} ${styles.photo3}`}>
                    <div className={styles.photoPlaceholder}>🌅</div>
                </div>
            </div>
        </div>
    );
}
