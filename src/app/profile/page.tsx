'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import styles from './page.module.css';
import { useAuthStatus, useAuthActions } from '@/lib/AuthProvider';
import PageSkeleton from '@/components/PageSkeleton';
import Lightbox from '@/components/Lightbox';
import { getVisiblePhotos, Photo } from '@/lib/data/photo.store';

export default function ProfilePage() {
    const { user, friends, authStatus } = useAuthStatus();
    const { logout } = useAuthActions();
    const router = useRouter();

    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [showFriendsModal, setShowFriendsModal] = useState(false);

    const loadPhotos = useCallback(async () => {
        if (!user) return;

        const visiblePhotos = await getVisiblePhotos(user);
        // Filter to only photos uploaded by this user
        const userPhotos = visiblePhotos.filter(p => p.uploader === user && !p.deleted);
        setPhotos(userPhotos);
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        loadPhotos();
    }, [loadPhotos]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    if (authStatus === 'loading') {
        return <PageSkeleton />;
    }

    if (authStatus === 'unauthenticated') {
        router.push('/login');
        return <PageSkeleton />;
    }

    return (
        <Layout>
            <div className={styles.container}>
                {/* Profile Header */}
                <div className={styles.header}>
                    <div className={styles.avatar}>
                        {user?.[0]?.toUpperCase()}
                    </div>
                    <div className={styles.info}>
                        <h1 className={styles.username}>@{user}</h1>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <span className={styles.statValue}>{photos.length}</span>
                                <span className={styles.statLabel}>Photos</span>
                            </div>
                            <div
                                className={`${styles.stat} ${styles.clickable}`}
                                onClick={() => setShowFriendsModal(true)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowFriendsModal(true); } }}
                                aria-label={`View friends (${friends.length})`}
                            >
                                <span className={styles.statValue}>{friends.length}</span>
                                <span className={styles.statLabel}>Friends</span>
                            </div>
                        </div>
                    </div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        Logout
                    </button>
                </div>

                {/* Photo Gallery */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Your Photos</h2>

                    {isLoading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                        </div>
                    ) : photos.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📷</div>
                            <p>You haven't uploaded any photos yet</p>
                            <button
                                className={styles.uploadBtn}
                                onClick={() => router.push('/')}
                            >
                                Upload Your First Photo
                            </button>
                        </div>
                    ) : (
                        <div className={styles.gallery}>
                            {photos.map((photo, index) => (
                                <div
                                    key={photo.id}
                                    className={styles.galleryItem}
                                    onClick={() => openLightbox(index)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index); } }}
                                >
                                    <img
                                        src={photo.url}
                                        alt={`Photo uploaded on ${new Date(photo.timestamp).toLocaleDateString()}`}
                                        className={styles.galleryImage}
                                        loading="lazy"
                                    />
                                    <div className={styles.galleryOverlay}>
                                        <span className={styles.photoDate}>
                                            {new Date(photo.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lightbox */}
                <Lightbox
                    isOpen={lightboxOpen}
                    imageUrl={photos[lightboxIndex]?.url || ''}
                    photoId={photos[lightboxIndex]?.id || ''}
                    onClose={() => setLightboxOpen(false)}
                    onPrev={() => setLightboxIndex(i => Math.max(0, i - 1))}
                    onNext={() => setLightboxIndex(i => Math.min(photos.length - 1, i + 1))}
                    hasPrev={lightboxIndex > 0}
                    hasNext={lightboxIndex < photos.length - 1}
                />

                {/* Friends Modal */}
                {showFriendsModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowFriendsModal(false)}>
                        <div
                            className={styles.modal}
                            onClick={e => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="friends-modal-title"
                        >
                            <div className={styles.modalHeader}>
                                <h2 id="friends-modal-title">Friends ({friends.length})</h2>
                                <button
                                    className={styles.closeBtn}
                                    onClick={() => setShowFriendsModal(false)}
                                    aria-label="Close friends modal"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className={styles.friendsList}>
                                {friends.length === 0 ? (
                                    <div className={styles.noFriends}>
                                        <p>No friends yet</p>
                                        <button
                                            className={styles.addFriendsBtn}
                                            onClick={() => router.push('/friends')}
                                        >
                                            Add Friends
                                        </button>
                                    </div>
                                ) : (
                                    friends.map(friend => (
                                        <div key={friend} className={styles.friendItem}>
                                            <div className={styles.friendAvatar}>
                                                {friend[0]?.toUpperCase()}
                                            </div>
                                            <span className={styles.friendName}>@{friend}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
