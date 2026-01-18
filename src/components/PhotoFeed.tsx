'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import styles from './PhotoFeed.module.css';
import PhotoSkeleton from './PhotoSkeleton';
import Lightbox from './Lightbox';
import LikeButton from './LikeButton';
import EditTagsModal from './EditTagsModal';
import { getVisiblePhotos, subscribeToPhotoUpdates, Photo, invalidatePhotoCache, searchPhotos } from '@/lib/data/photo.store';
import { softDeletePhoto, restorePhoto, permanentlyDeletePhoto } from '@/lib/data/media.store';
import { toggleLike, loadReactionsForPhotos } from '@/lib/data/reaction.store';
import { useAuthStatus } from '@/lib/AuthProvider';
import { useToast } from './ToastManager';

interface DeletedPhoto {
    photo: Photo;
    timeoutId: NodeJS.Timeout;
}

interface PhotoReaction {
    count: number;
    isLiked: boolean;
}

interface PhotoFeedProps {
    searchQuery?: string;
}

export default function PhotoFeed({ searchQuery = '' }: PhotoFeedProps) {
    const { user } = useAuthStatus();
    const { showToast } = useToast();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
    const [deletedPhotos, setDeletedPhotos] = useState<Map<string, DeletedPhoto>>(new Map());

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Edit tags modal state
    const [editTagsOpen, setEditTagsOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

    // Reactions state
    const [reactions, setReactions] = useState<Map<string, PhotoReaction>>(new Map());

    // Double-tap detection
    const lastTapRef = useRef<{ photoId: string; time: number } | null>(null);

    const loadPhotos = useCallback(async () => {
        if (!user) return;
        invalidatePhotoCache();
        const visiblePhotos = await getVisiblePhotos(user);
        const activePhotos = visiblePhotos.filter(p => !p.deleted);
        setPhotos(activePhotos);
        setIsLoading(false);

        // Load reactions
        if (activePhotos.length > 0) {
            const photoIds = activePhotos.map(p => p.id);
            const reactionData = await loadReactionsForPhotos(photoIds, user);
            setReactions(reactionData);
        }
    }, [user]);

    useEffect(() => {
        loadPhotos();

        const unsubscribe = subscribeToPhotoUpdates(() => loadPhotos());

        const handleDeleted = () => loadPhotos();
        const handleRestored = () => loadPhotos();
        const handleUpdated = () => loadPhotos();

        window.addEventListener('photoDeleted', handleDeleted);
        window.addEventListener('photoRestored', handleRestored);
        window.addEventListener('photoUpdated', handleUpdated);

        return () => {
            unsubscribe();
            window.removeEventListener('photoDeleted', handleDeleted);
            window.removeEventListener('photoRestored', handleRestored);
            window.removeEventListener('photoUpdated', handleUpdated);
        };
    }, [loadPhotos]);

    const handleImageLoad = (photoId: string) => {
        setLoadedImages(prev => new Set(prev).add(photoId));
    };

    const handleDelete = async (photo: Photo) => {
        if (!user || photo.uploader !== user) return;

        const success = await softDeletePhoto(photo.id);
        if (!success) {
            showToast({ type: 'error', message: 'Failed to delete photo' });
            return;
        }

        const timeoutId = setTimeout(async () => {
            await permanentlyDeletePhoto(photo.id);
            setDeletedPhotos(prev => {
                const updated = new Map(prev);
                updated.delete(photo.id);
                return updated;
            });
        }, 30000);

        setDeletedPhotos(prev => new Map(prev).set(photo.id, { photo, timeoutId }));

        showToast({
            type: 'info',
            message: 'Photo deleted',
            duration: 10000,
            action: {
                label: 'Undo',
                onClick: () => handleUndo(photo.id)
            }
        });
    };

    const handleUndo = async (photoId: string) => {
        const deleted = deletedPhotos.get(photoId);
        if (!deleted) return;

        clearTimeout(deleted.timeoutId);
        setDeletedPhotos(prev => {
            const updated = new Map(prev);
            updated.delete(photoId);
            return updated;
        });

        const success = await restorePhoto(photoId);
        if (success) {
            showToast({ type: 'success', message: 'Photo restored' });
        }
    };

    const handleRefresh = () => {
        setIsLoading(true);
        loadPhotos();
        showToast({ type: 'info', message: 'Feed refreshed', duration: 2000 });
    };

    const handleLike = async (photoId: string) => {
        if (!user) return;

        try {
            const isNowLiked = await toggleLike(photoId, user);

            setReactions(prev => {
                const updated = new Map(prev);
                const current = prev.get(photoId) || { count: 0, isLiked: false };
                updated.set(photoId, {
                    count: isNowLiked ? current.count + 1 : Math.max(0, current.count - 1),
                    isLiked: isNowLiked
                });
                return updated;
            });
        } catch {
            showToast({ type: 'error', message: 'Failed to update like' });
        }
    };

    const handleDoubleTap = (photo: Photo) => {
        const now = Date.now();
        const last = lastTapRef.current;

        if (last && last.photoId === photo.id && (now - last.time) < 300) {
            handleLike(photo.id);
            lastTapRef.current = null;
        } else {
            lastTapRef.current = { photoId: photo.id, time: now };
        }
    };

    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const openEditTags = (photo: Photo) => {
        setEditingPhoto(photo);
        setEditTagsOpen(true);
    };

    const handleTagsSaved = (newTags: string[]) => {
        if (editingPhoto) {
            setPhotos(prev => prev.map(p =>
                p.id === editingPhoto.id ? { ...p, tags: newTags } : p
            ));
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.feedTitle}>Your Feed</h2>
                </div>
                <div className={styles.grid}>
                    <PhotoSkeleton count={6} />
                </div>
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.feedTitle}>Your Feed</h2>
                    <button className={styles.refreshBtn} onClick={handleRefresh}>
                        ↻ Refresh
                    </button>
                </div>
                <div className={styles.grid}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📸</div>
                        <h3>No photos yet</h3>
                        <p>Upload a photo or get tagged by friends to see memories here.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.feedTitle}>Your Feed</h2>
                <button className={styles.refreshBtn} onClick={handleRefresh}>
                    ↻ Refresh
                </button>
            </div>
            <div className={styles.grid}>
                {(() => {
                    const filteredPhotos = searchPhotos(photos, searchQuery);
                    if (filteredPhotos.length === 0 && searchQuery) {
                        return (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyIcon}>🔍</div>
                                <h3>No results found</h3>
                                <p>No photos match "{searchQuery}"</p>
                            </div>
                        );
                    }
                    return filteredPhotos.map((photo, index) => {
                        const reaction = reactions.get(photo.id) || { count: 0, isLiked: false };

                        return (
                            <div key={photo.id} className={styles.card}>
                                <div
                                    className={styles.imageContainer}
                                    onClick={() => handleDoubleTap(photo)}
                                >
                                    {!loadedImages.has(photo.id) && (
                                        <div className={styles.imagePlaceholder} />
                                    )}
                                    <img
                                        src={photo.url}
                                        alt="Shared memory"
                                        className={`${styles.image} ${loadedImages.has(photo.id) ? styles.imageLoaded : styles.imageLoading}`}
                                        loading="lazy"
                                        onLoad={() => handleImageLoad(photo.id)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openLightbox(index);
                                        }}
                                        style={{ cursor: 'zoom-in' }}
                                    />

                                    {/* Action buttons (owner only) */}
                                    {photo.uploader === user && (
                                        <div className={styles.cardActions}>
                                            <button
                                                className={styles.editBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditTags(photo);
                                                }}
                                                aria-label="Edit tags"
                                                title="Edit tags"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(photo);
                                                }}
                                                aria-label="Delete photo"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.info}>
                                    <div className={styles.meta}>
                                        <span className={styles.uploader}>@{photo.uploader}</span>
                                        <span className={styles.date}>
                                            {new Date(photo.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className={styles.actions}>
                                        <LikeButton
                                            isLiked={reaction.isLiked}
                                            count={reaction.count}
                                            onToggle={() => handleLike(photo.id)}
                                        />
                                    </div>
                                    {photo.tags.length > 0 && (
                                        <div className={styles.tags}>
                                            {photo.tags.map(tag => (
                                                <span key={tag} className={styles.tag}>@{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    });
                })()}
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

            {/* Edit Tags Modal */}
            <EditTagsModal
                isOpen={editTagsOpen}
                photoId={editingPhoto?.id || ''}
                currentTags={editingPhoto?.tags || []}
                onClose={() => {
                    setEditTagsOpen(false);
                    setEditingPhoto(null);
                }}
                onSave={handleTagsSaved}
            />
        </div>
    );
}

