'use client';

import React, { useState, useRef } from 'react';
import styles from './UploadModal.module.css';
import { storage } from '@/lib/storage';
import { useUser } from '@/lib/useUser';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
    const { user, friends } = useUser();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleTag = (tagUser: string) => {
        if (selectedTags.includes(tagUser)) {
            setSelectedTags(selectedTags.filter(tag => tag !== tagUser));
        } else {
            setSelectedTags([...selectedTags, tagUser]);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setSelectedTags([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;

        // Create a fake URL for the file (in a real app, upload to storage)
        const fakeUrl = URL.createObjectURL(selectedFile);

        const newPhoto = {
            id: Date.now().toString(),
            url: fakeUrl,
            uploader: user,
            tags: selectedTags,
            timestamp: Date.now()
        };

        await storage.savePhoto(newPhoto);
        onUploadComplete();
        resetForm();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h2 className={styles.title}>Share a Photo</h2>

                {!previewUrl ? (
                    <div
                        className={styles.dropzone}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <p>Click to select a photo</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            hidden
                        />
                    </div>
                ) : (
                    <div>
                        <img src={previewUrl} alt="Preview" className={styles.preview} />
                        <button
                            className={styles.cancel}
                            onClick={() => {
                                setPreviewUrl(null);
                                setSelectedFile(null);
                            }}
                            style={{ marginBottom: '1rem', width: '100%' }}
                        >
                            Change Photo
                        </button>
                    </div>
                )}

                <div className={styles.field}>
                    <label className={styles.label}>Tag Friends (Only friends can be tagged)</label>
                    <div className={styles.tagsContainer}>
                        {friends.length === 0 && <p style={{ color: '#666', fontSize: '0.8rem' }}>You have no friends yet. Add some in the Friends page!</p>}
                        {friends.map(u => (
                            <button
                                key={u}
                                className={`${styles.tagChip} ${selectedTags.includes(u) ? styles.selected : ''}`}
                                onClick={() => toggleTag(u)}
                            >
                                @{u}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.cancel} onClick={onClose}>Cancel</button>
                    <button
                        className={styles.submit}
                        onClick={handleUpload}
                        disabled={!selectedFile}
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
}
