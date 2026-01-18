'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import PhotoFeed from '@/components/PhotoFeed';
import UploadModal from '@/components/UploadModal';
import SearchBar from '@/components/SearchBar';
import styles from './page.module.css';
import { useAuthStatus } from '@/lib/AuthProvider';
import PageSkeleton from '@/components/PageSkeleton';

export default function Home() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, authStatus } = useAuthStatus();
  const router = useRouter();

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Show skeleton while checking auth (non-blocking)
  if (authStatus === 'loading') {
    return <PageSkeleton />;
  }

  // Redirect if not authenticated
  if (authStatus === 'unauthenticated') {
    router.push('/');
    return <PageSkeleton />;
  }

  return (
    <Layout>
      <div className={styles.container}>
        <SearchBar onSearch={handleSearch} />
        <PhotoFeed searchQuery={searchQuery} />

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
          }}
        />
      </div>
    </Layout>
  );
}
