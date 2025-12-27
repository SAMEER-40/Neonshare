/**
 * LikeButton
 * Heart button with animation for liking photos.
 */

'use client';

import React, { useState } from 'react';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
    isLiked: boolean;
    count: number;
    onToggle: () => Promise<void>;
    disabled?: boolean;
}

export default function LikeButton({ isLiked, count, onToggle, disabled = false }: LikeButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
    const [optimisticCount, setOptimisticCount] = useState(count);

    // Sync with prop changes
    React.useEffect(() => {
        setOptimisticLiked(isLiked);
        setOptimisticCount(count);
    }, [isLiked, count]);

    const handleClick = async () => {
        if (disabled) return;

        // Optimistic update
        setOptimisticLiked(!optimisticLiked);
        setOptimisticCount(prev => optimisticLiked ? prev - 1 : prev + 1);

        // Animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);

        try {
            await onToggle();
        } catch {
            // Revert on error
            setOptimisticLiked(isLiked);
            setOptimisticCount(count);
        }
    };

    return (
        <button
            className={`${styles.button} ${optimisticLiked ? styles.liked : ''} ${isAnimating ? styles.animating : ''}`}
            onClick={handleClick}
            disabled={disabled}
            aria-label={optimisticLiked ? 'Unlike' : 'Like'}
        >
            <span className={styles.heart}>
                {optimisticLiked ? '❤️' : '🤍'}
            </span>
            {optimisticCount > 0 && (
                <span className={styles.count}>{optimisticCount}</span>
            )}
        </button>
    );
}
