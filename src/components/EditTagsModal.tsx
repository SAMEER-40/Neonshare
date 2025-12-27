/**
 * EditTagsModal
 * Modal for adding/removing tags on a photo.
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './EditTagsModal.module.css';
import { updatePhotoTags } from '@/lib/data/media.store';
import { useAuthStatus } from '@/lib/AuthProvider';
import { useToast } from './ToastManager';

interface EditTagsModalProps {
    isOpen: boolean;
    photoId: string;
    currentTags: string[];
    onClose: () => void;
    onSave: (newTags: string[]) => void;
}

export default function EditTagsModal({
    isOpen,
    photoId,
    currentTags,
    onClose,
    onSave
}: EditTagsModalProps) {
    const { friends } = useAuthStatus();
    const { showToast } = useToast();
    const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with props when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedTags(currentTags);
        }
    }, [isOpen, currentTags]);

    if (!isOpen) return null;

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await updatePhotoTags(photoId, selectedTags);
        setIsSaving(false);

        if (success) {
            showToast({ type: 'success', message: 'Tags updated!' });
            onSave(selectedTags);
            onClose();
        } else {
            showToast({ type: 'error', message: 'Failed to update tags' });
        }
    };

    const hasChanges = JSON.stringify(selectedTags.sort()) !== JSON.stringify(currentTags.sort());

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 className={styles.title}>Edit Tags</h2>

                <div className={styles.tagsContainer}>
                    {friends.length === 0 ? (
                        <p className={styles.noFriends}>
                            Add friends to tag them in photos!
                        </p>
                    ) : (
                        friends.map(friend => (
                            <button
                                key={friend}
                                className={`${styles.tagChip} ${selectedTags.includes(friend) ? styles.selected : ''}`}
                                onClick={() => toggleTag(friend)}
                                disabled={isSaving}
                            >
                                @{friend}
                            </button>
                        ))
                    )}
                </div>

                <div className={styles.selectedInfo}>
                    {selectedTags.length === 0 ? (
                        <span className={styles.hint}>No one tagged</span>
                    ) : (
                        <span className={styles.hint}>
                            Tagged: {selectedTags.map(t => `@${t}`).join(', ')}
                        </span>
                    )}
                </div>

                <div className={styles.actions}>
                    <button className={styles.cancel} onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button
                        className={styles.save}
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                    >
                        {isSaving ? <span className="loading-spinner" /> : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
