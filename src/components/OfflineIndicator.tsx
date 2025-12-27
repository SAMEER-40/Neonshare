/**
 * OfflineIndicator
 * Shows a banner when the user is offline.
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './OfflineIndicator.module.css';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // Check initial state
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            // Show "back online" briefly
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Show banner initially if offline
        if (!navigator.onLine) {
            setShowBanner(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner) return null;

    return (
        <div className={`${styles.banner} ${isOnline ? styles.online : styles.offline}`}>
            {isOnline ? (
                <>✓ Back online</>
            ) : (
                <>⚠️ You're offline. Some features may not work.</>
            )}
        </div>
    );
}
