/**
 * Lightbox
 * Full-screen image viewer with comments, download, and share actions.
 */

'use client';

import React, { useEffect, useCallback, useState } from 'react';
import styles from './Lightbox.module.css';
import Comments from './Comments';
import { useToast } from './ToastManager';
import { getLightboxUrl } from '@/lib/data/media.store';

interface LightboxProps {
    isOpen: boolean;
    imageUrl: string;
    photoId: string;
    alt?: string;
    onClose: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export default function Lightbox({
    isOpen,
    imageUrl,
    photoId,
    alt = 'Photo',
    onClose,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false
}: LightboxProps) {
    const { showToast } = useToast();
    const [showSidebar, setShowSidebar] = useState(true);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                onClose();
                break;
            case 'ArrowLeft':
                if (hasPrev && onPrev) onPrev();
                break;
            case 'ArrowRight':
                if (hasNext && onNext) onNext();
                break;
            case 'c':
                setShowSidebar(v => !v);
                break;
        }
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    // Download photo
    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `neonshare_${photoId}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showToast({ type: 'success', message: 'Photo downloaded!' });
        } catch (error) {
            showToast({ type: 'error', message: 'Download failed' });
        }
    };

    // Share photo
    const handleShare = async () => {
        const shareUrl = imageUrl;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this photo on NeonShare!',
                    url: shareUrl
                });
            } catch (err) {
                // User cancelled or error
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(shareUrl);
                showToast({ type: 'success', message: 'Link copied to clipboard!' });
            } catch {
                showToast({ type: 'error', message: 'Failed to copy link' });
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.container} ${showSidebar ? styles.withSidebar : ''}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Photo viewer"
            >
                {/* Close button */}
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                    ✕
                </button>

                {/* Navigation arrows */}
                {hasPrev && onPrev && (
                    <button
                        className={`${styles.navBtn} ${styles.prevBtn}`}
                        onClick={onPrev}
                        aria-label="Previous photo"
                    >
                        ‹
                    </button>
                )}
                {hasNext && onNext && (
                    <button
                        className={`${styles.navBtn} ${styles.nextBtn}`}
                        onClick={onNext}
                        aria-label="Next photo"
                    >
                        ›
                    </button>
                )}

                {/* Main content area */}
                <div className={styles.content}>
                    {/* Image */}
                    <div className={styles.imageWrapper}>
                        <img
                            src={getLightboxUrl(imageUrl)}
                            alt={alt}
                            className={styles.image}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>

                    {/* Sidebar with actions and comments */}
                    {showSidebar && (
                        <div className={styles.sidebar}>
                            {/* Action buttons */}
                            <div className={styles.actions}>
                                <button className={styles.actionBtn} onClick={handleDownload} title="Download">
                                    <span className={styles.actionIcon}>⬇</span>
                                    <span>Download</span>
                                </button>
                                <button className={styles.actionBtn} onClick={handleShare} title="Share">
                                    <span className={styles.actionIcon}>↗</span>
                                    <span>Share</span>
                                </button>
                            </div>

                            {/* Comments section */}
                            <div className={styles.commentsSection}>
                                <h3 className={styles.sectionTitle}>Comments</h3>
                                <Comments photoId={photoId} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Hint */}
                <div className={styles.hint}>
                    <kbd>Esc</kbd> close • <kbd>←</kbd><kbd>→</kbd> navigate • <kbd>C</kbd> toggle comments
                </div>
            </div>
        </div>
    );
}
