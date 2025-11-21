'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import PhotoFeed from '@/components/PhotoFeed';
import UploadModal from '@/components/UploadModal';
import styles from './page.module.css';
import { useUser } from '@/lib/useUser';

export default function Home() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user, isAuthenticated } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Check auth after initial load to avoid hydration mismatch
    // In a real app we'd use middleware or server components
    const timer = setTimeout(() => {
      if (!isAuthenticated && !localStorage.getItem('photo_share_current_user')) {
        router.push('/login');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (!user) return null; // Prevent flash of content

  return (
    <Layout>
      <div className={styles.container}>
        <PhotoFeed />

        <button
          className={styles.fab}
          onClick={() => setIsUploadOpen(true)}
          aria-label="Upload Photo"
        >
          <span className={styles.fabIcon}>+</span>
        </button>

        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            setIsUploadOpen(false);
            // Feed will auto-refresh due to event listener in PhotoFeed
          }}
        />
      </div>
    </Layout>
  );
}
