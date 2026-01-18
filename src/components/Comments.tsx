'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './Comments.module.css';
import { getComments, addComment, deleteComment, Comment } from '@/lib/data/comment.store';
import { useAuthStatus } from '@/lib/AuthProvider';

interface CommentsProps {
    photoId: string;
}

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function Comments({ photoId }: CommentsProps) {
    const { user } = useAuthStatus();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadComments = useCallback(async () => {
        setIsLoading(true);
        const data = await getComments(photoId);
        setComments(data);
        setIsLoading(false);
    }, [photoId]);

    useEffect(() => {
        loadComments();

        // Listen for comment updates
        const handleCommentAdded = (e: CustomEvent) => {
            if (e.detail.photoId === photoId) {
                loadComments();
            }
        };
        const handleCommentDeleted = (e: CustomEvent) => {
            if (e.detail.photoId === photoId) {
                loadComments();
            }
        };

        window.addEventListener('commentAdded', handleCommentAdded as EventListener);
        window.addEventListener('commentDeleted', handleCommentDeleted as EventListener);

        return () => {
            window.removeEventListener('commentAdded', handleCommentAdded as EventListener);
            window.removeEventListener('commentDeleted', handleCommentDeleted as EventListener);
        };
    }, [photoId, loadComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const comment = await addComment(photoId, user, newComment.trim());
        if (comment) {
            setComments(prev => [...prev, comment]);
            setNewComment('');
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (commentId: string) => {
        if (!user) return;

        const success = await deleteComment(photoId, commentId);
        if (success) {
            setComments(prev => prev.filter(c => c.id !== commentId));
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {comments.length === 0 ? (
                <div className={styles.empty}>No comments yet. Be the first!</div>
            ) : (
                <div className={styles.commentList}>
                    {comments.map(comment => (
                        <div key={comment.id} className={styles.comment}>
                            <div className={styles.avatar}>
                                {comment.userId[0].toUpperCase()}
                            </div>
                            <div className={styles.content}>
                                <div className={styles.header}>
                                    <span className={styles.username}>@{comment.userId}</span>
                                    <span className={styles.time}>{formatTimeAgo(comment.timestamp)}</span>
                                </div>
                                <p className={styles.text}>{comment.text}</p>
                            </div>
                            {user === comment.userId && (
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => handleDelete(comment.id)}
                                    title="Delete comment"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {user && (
                <form onSubmit={handleSubmit} className={styles.form}>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className={styles.input}
                        disabled={isSubmitting}
                        maxLength={500}
                    />
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={!newComment.trim() || isSubmitting}
                    >
                        {isSubmitting ? '...' : 'Post'}
                    </button>
                </form>
            )}
        </div>
    );
}
