'use client';

import React, { useState, useRef } from 'react';
import styles from './UploadModal.module.css';
import { uploadImage, UploadProgress } from '@/lib/data/media.store';
import { useAuthStatus } from '@/lib/AuthProvider';
import { useToast } from './ToastManager';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
    const { user, friends } = useAuthStatus();
    const { showToast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast({ type: 'error', message: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' });
                return;
            }

            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                showToast({ type: 'error', message: 'File too large. Maximum size is 10MB.' });
                return;
            }

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
        setUploadProgress(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;

        try {
            await uploadImage(
                selectedFile,
                user,
                selectedTags,
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            showToast({ type: 'success', message: 'Photo uploaded successfully!' });
            onUploadComplete();
            resetForm();
        } catch (error: any) {
            showToast({ type: 'error', message: error.message || 'Upload failed' });
            setUploadProgress(null);
        }
    };

    const handleClose = () => {
        if (uploadProgress?.state === 'uploading') {
            showToast({ type: 'warning', message: 'Upload in progress. Please wait.' });
            return;
        }
        resetForm();
        onClose();
    };

    const isUploading = uploadProgress?.state === 'uploading';

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div
                className={styles.modal}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-title"
            >
                <h2 id="upload-title" className={styles.title}>Share a Photo</h2>

                {!previewUrl ? (
                    <div
                        className={styles.dropzone}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                        role="button"
                        tabIndex={0}
                        aria-label="Select a photo to upload"
                    >
                        <div className={styles.dropzoneIcon}>📷</div>
                        <p>Click to select a photo</p>
                        <span className={styles.dropzoneHint}>JPEG, PNG, GIF, WebP • Max 10MB</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            hidden
                            aria-label="Select a photo to upload"
                        />
                    </div>
                ) : (
                    <div className={styles.previewContainer}>
                        <img src={previewUrl} alt="Preview" className={styles.preview} />
                        {!isUploading && (
                            <button
                                className={styles.changeBtn}
                                onClick={() => {
                                    setPreviewUrl(null);
                                    setSelectedFile(null);
                                }}
                            >
                                Change Photo
                            </button>
                        )}

                        {/* Upload progress bar */}
                        {isUploading && (
                            <div className={styles.progressContainer}>
                                <div
                                    className={styles.progressBar}
                                    style={{ width: `${uploadProgress.progress}%` }}
                                    role="progressbar"
                                    aria-valuenow={uploadProgress.progress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Upload progress"
                                />
                                <span className={styles.progressText} aria-live="polite">
                                    Uploading... {Math.round(uploadProgress.progress)}%
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.field}>
                    <label className={styles.label}>Tag Friends</label>
                    <div className={styles.tagsContainer}>
                        {friends.length === 0 ? (
                            <p className={styles.noFriends}>
                                No friends yet. Add some in the Friends page!
                            </p>
                        ) : (
                            friends.map(u => (
                                <button
                                    key={u}
                                    className={`${styles.tagChip} ${selectedTags.includes(u) ? styles.selected : ''}`}
                                    onClick={() => toggleTag(u)}
                                    disabled={isUploading}
                                    aria-pressed={selectedTags.includes(u)}
                                >
                                    @{u}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.cancel}
                        onClick={handleClose}
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.submit}
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading}
                    >
                        {isUploading ? (
                            <span className={styles.uploadingText}>
                                <span className="loading-spinner" /> Uploading...
                            </span>
                        ) : (
                            'Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
