/**
 * Lightbox
 * Full-screen image viewer with keyboard navigation.
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import styles from './Lightbox.module.css';

interface LightboxProps {
    isOpen: boolean;
    imageUrl: string;
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
    alt = 'Photo',
    onClose,
    onPrev,
    onNext,
    hasPrev = false,
    hasNext = false
}: LightboxProps) {

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

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
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

                {/* Image */}
                <img
                    src={imageUrl}
                    alt={alt}
                    className={styles.image}
                    onClick={e => e.stopPropagation()}
                />

                {/* Hint */}
                <div className={styles.hint}>
                    Press <kbd>Esc</kbd> to close • Use <kbd>←</kbd> <kbd>→</kbd> to navigate
                </div>
            </div>
        </div>
    );
}
