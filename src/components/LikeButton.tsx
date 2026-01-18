/**
 * LikeButton
 * Heart button with animation for liking photos.
 * Includes rate limiting to prevent spam.
 */

'use client';

import React, { useState, useRef } from 'react';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
    isLiked: boolean;
    count: number;
    onToggle: () => Promise<void>;
    disabled?: boolean;
}

const RATE_LIMIT_MS = 1000; // 1 second cooldown between likes

export default function LikeButton({ isLiked, count, onToggle, disabled = false }: LikeButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
    const [optimisticCount, setOptimisticCount] = useState(count);
    const [isPending, setIsPending] = useState(false);
    const lastClickRef = useRef<number>(0);

    // Sync with prop changes
    React.useEffect(() => {
        setOptimisticLiked(isLiked);
        setOptimisticCount(count);
    }, [isLiked, count]);

    const handleClick = async () => {
        if (disabled || isPending) return;

        // Rate limit check
        const now = Date.now();
        if (now - lastClickRef.current < RATE_LIMIT_MS) {
            return; // Ignore rapid clicks
        }
        lastClickRef.current = now;

        // Optimistic update
        setOptimisticLiked(!optimisticLiked);
        setOptimisticCount(prev => optimisticLiked ? prev - 1 : prev + 1);
        setIsPending(true);

        // Animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);

        try {
            await onToggle();
        } catch {
            // Revert on error
            setOptimisticLiked(isLiked);
            setOptimisticCount(count);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <button
            className={`${styles.button} ${optimisticLiked ? styles.liked : ''} ${isAnimating ? styles.animating : ''}`}
            onClick={handleClick}
            disabled={disabled || isPending}
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

