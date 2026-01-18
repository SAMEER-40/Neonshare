'use client';

import React, { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import styles from './page.module.css';
import { useAuthStatus, useAuthActions } from '@/lib/AuthProvider';
import PageSkeleton from '@/components/PageSkeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastManager';

export default function FriendsPage() {
    const { user, friends, authStatus } = useAuthStatus();
    const { addFriend, removeFriend } = useAuthActions();
    const { showToast } = useToast();
    const [newFriend, setNewFriend] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [removingFriend, setRemovingFriend] = useState<string | null>(null);
    const router = useRouter();

    // Filter friends based on search
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friends;
        return friends.filter(f =>
            f.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [friends, searchQuery]);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newFriend.trim()) return;
        if (newFriend === user) {
            showToast({ type: 'error', message: "You can't add yourself!" });
            return;
        }
        if (friends.includes(newFriend.trim())) {
            showToast({ type: 'info', message: `@${newFriend} is already your friend!` });
            return;
        }

        setIsAdding(true);
        if (await addFriend(newFriend.trim())) {
            showToast({ type: 'success', message: `Added @${newFriend} as a friend!` });
            setNewFriend('');
        } else {
            showToast({ type: 'error', message: `User @${newFriend} not found.` });
        }
        setIsAdding(false);
    };

    const handleRemoveFriend = async (friendUsername: string) => {
        if (removingFriend) return;

        if (!confirm(`Remove @${friendUsername} from friends?`)) return;

        setRemovingFriend(friendUsername);
        if (await removeFriend(friendUsername)) {
            showToast({ type: 'success', message: `Removed @${friendUsername}` });
        } else {
            showToast({ type: 'error', message: 'Failed to remove friend' });
        }
        setRemovingFriend(null);
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
                <h1 className={styles.title}>Friends</h1>

                <div className={styles.grid}>
                    {/* Add Friend Section */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Add a Friend</h2>
                        <form onSubmit={handleAddFriend} className={styles.form}>
                            <input
                                type="text"
                                placeholder="Enter username..."
                                value={newFriend}
                                onChange={(e) => setNewFriend(e.target.value)}
                                className={styles.input}
                                disabled={isAdding}
                            />
                            <button type="submit" className={styles.addButton} disabled={isAdding || !newFriend.trim()}>
                                {isAdding ? <span className="loading-spinner" /> : 'Add'}
                            </button>
                        </form>
                    </div>

                    {/* Friends List Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                Your Friends <span className={styles.count}>({friends.length})</span>
                            </h2>
                        </div>

                        {/* Search Filter */}
                        {friends.length > 3 && (
                            <div className={styles.searchContainer}>
                                <input
                                    type="text"
                                    placeholder="Search friends..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={styles.searchInput}
                                />
                                {searchQuery && (
                                    <button
                                        className={styles.clearSearch}
                                        onClick={() => setSearchQuery('')}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={styles.friendList}>
                            {friends.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.emptyIcon}>👥</div>
                                    <p>No friends yet</p>
                                    <span>Add someone above to start sharing!</span>
                                </div>
                            ) : filteredFriends.length === 0 ? (
                                <p className={styles.noResults}>No friends match "{searchQuery}"</p>
                            ) : (
                                filteredFriends.map(friend => (
                                    <div key={friend} className={styles.friendItem}>
                                        <div className={styles.avatar}>
                                            {friend[0].toUpperCase()}
                                        </div>
                                        <span className={styles.name}>@{friend}</span>
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => handleRemoveFriend(friend)}
                                            disabled={removingFriend === friend}
                                        >
                                            {removingFriend === friend ? '...' : 'Remove'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
