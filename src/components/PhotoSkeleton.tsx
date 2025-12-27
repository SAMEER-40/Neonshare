/**
 * PhotoSkeleton
 * Skeleton card for individual photo loading.
 */

import React from 'react';
import styles from './PhotoSkeleton.module.css';

interface PhotoSkeletonProps {
    count?: number;
}

export default function PhotoSkeleton({ count = 6 }: PhotoSkeletonProps) {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div key={i} className={styles.card}>
                    <div className={styles.image}></div>
                    <div className={styles.info}>
                        <div className={styles.meta}>
                            <div className={styles.uploader}></div>
                            <div className={styles.date}></div>
                        </div>
                        <div className={styles.tags}>
                            <div className={styles.tag}></div>
                            <div className={styles.tag}></div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
