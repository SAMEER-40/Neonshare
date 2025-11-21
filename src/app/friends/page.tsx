'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import styles from './page.module.css';
import { useUser } from '@/lib/useUser';

export default function FriendsPage() {
    const { user, friends, addFriend } = useUser();
    const [newFriend, setNewFriend] = useState('');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!newFriend.trim()) return;
        if (newFriend === user) {
            setMessage({ text: "You can't add yourself!", type: 'error' });
            return;
        }

        if (await addFriend(newFriend.trim())) {
            setMessage({ text: `Added @${newFriend} as a friend!`, type: 'success' });
            setNewFriend('');
        } else {
            setMessage({ text: `Could not add @${newFriend}. User may not exist or is already a friend.`, type: 'error' });
        }
    };

    if (!user) return null;

    return (
        <Layout>
            <div className={styles.container}>
                <h1 className={styles.title}>My Friends</h1>

                <div className={styles.grid}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Add a Friend</h2>
                        <form onSubmit={handleAddFriend} className={styles.form}>
                            <input
                                type="text"
                                placeholder="Enter username (e.g. alice)"
                                value={newFriend}
                                onChange={(e) => setNewFriend(e.target.value)}
                                className={styles.input}
                            />
                            <button type="submit" className={styles.addButton}>Add</button>
                        </form>
                        {message && (
                            <div className={`${styles.message} ${styles[message.type]}`}>
                                {message.text}
                            </div>
                        )}
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Your Friends ({friends.length})</h2>
                        <div className={styles.friendList}>
                            {friends.length === 0 ? (
                                <p className={styles.empty}>No friends yet. Add someone to start sharing!</p>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend} className={styles.friendItem}>
                                        <div className={styles.avatar}>{friend[0].toUpperCase()}</div>
                                        <span className={styles.name}>@{friend}</span>
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
