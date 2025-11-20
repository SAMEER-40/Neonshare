'use client';

import React, { useEffect, useState } from 'react';
import styles from './PhotoFeed.module.css';
import { storage, Photo } from '@/lib/storage';
import { useUser } from '@/lib/useUser';

export default function PhotoFeed() {
    const { user } = useUser();
    const [photos, setPhotos] = useState<Photo[]>([]);

    const loadPhotos = async () => {
        const allPhotos = await storage.getPhotos();
        setPhotos(allPhotos);
    };

    useEffect(() => {
        loadPhotos();
        // Listen for updates (e.g. after upload)
        window.addEventListener('storage', loadPhotos); // For cross-tab
        // We might need a custom event for same-tab updates if we don't use a context
        // But for now, we can pass a refresh trigger or just poll/re-render
    }, []);

    // Expose a refresh method or listen to a custom event
    useEffect(() => {
        const handleRefresh = () => loadPhotos();
        window.addEventListener('photoUploaded', handleRefresh);
        return () => window.removeEventListener('photoUploaded', handleRefresh);
    }, []);

    // Filter photos based on privacy rules
    // Visible if: Current user is uploader OR Current user is in tags
    const visiblePhotos = photos.filter(photo => {
        if (!user) return false;
        return photo.uploader === user || photo.tags.includes(user);
    });

    if (visiblePhotos.length === 0) {
        return (
            <div className={styles.grid}>
                <div className={styles.emptyState}>
                    <h3>No photos yet</h3>
                    <p>Upload a photo or switch users to see shared memories.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.grid}>
            {visiblePhotos.map(photo => (
                <div key={photo.id} className={styles.card}>
                    <div className={styles.imageContainer}>
                        <img src={photo.url} alt="Shared memory" className={styles.image} />
                    </div>
                    <div className={styles.info}>
                        <div className={styles.meta}>
                            <span className={styles.uploader}>@{photo.uploader}</span>
                            <span className={styles.date}>
                                {new Date(photo.timestamp).toLocaleDateString()}
                            </span>
                        </div>
                        <div className={styles.tags}>
                            {photo.tags.map(tag => (
                                <span key={tag} className={styles.tag}>@{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
