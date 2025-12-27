/**
 * PageSkeleton
 * Full-page loading skeleton for route transitions.
 */

import React from 'react';
import styles from './PageSkeleton.module.css';

export default function PageSkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.logo}></div>
                <div className={styles.controls}>
                    <div className={styles.pill}></div>
                    <div className={styles.pill}></div>
                </div>
            </div>
            <div className={styles.content}>
                <div className={styles.grid}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={styles.card}>
                            <div className={styles.image}></div>
                            <div className={styles.meta}>
                                <div className={styles.line}></div>
                                <div className={styles.lineShort}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
