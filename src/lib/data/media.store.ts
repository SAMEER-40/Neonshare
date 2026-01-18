/**
 * Media Data Store
 * Uses Cloudinary for image storage (free tier: 25GB storage, 25GB bandwidth/month)
 */

import { db } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// Types
export interface ImageRecord {
    id: string;
    url: string;
    uploader: string;
    tags: string[];
    timestamp: number;
    pending?: boolean;
    deleted?: boolean;
}

export interface UploadProgress {
    progress: number; // 0-100
    state: 'uploading' | 'success' | 'error' | 'cancelled';
    error?: string;
}

// Cloudinary config (using unsigned upload preset)
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

/**
 * Validate image file before upload
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' };
    }

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File too large. Maximum size is 10MB.' };
    }

    return { valid: true };
}

/**
 * Upload image to Cloudinary with progress tracking
 */
export function uploadImage(
    file: File,
    uploader: string,
    tags: string[],
    onProgress?: (progress: UploadProgress) => void
): Promise<ImageRecord> {
    return new Promise(async (resolve, reject) => {
        // Validate
        const validation = validateImage(file);
        if (!validation.valid) {
            onProgress?.({ progress: 0, state: 'error', error: validation.error });
            reject(new Error(validation.error));
            return;
        }

        // Check Cloudinary config
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            const error = 'Cloudinary not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local';
            console.error(error);
            onProgress?.({ progress: 0, state: 'error', error });
            reject(new Error(error));
            return;
        }

        // Generate unique ID
        const photoId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            onProgress?.({ progress: 5, state: 'uploading' });

            // Create form data for Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', `neonshare/${uploader}`);
            formData.append('public_id', photoId);

            // Upload with XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 90) + 5; // 5-95%
                    onProgress?.({ progress, state: 'uploading' });
                }
            });

            xhr.addEventListener('load', async () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        const downloadURL = response.secure_url;

                        // Create photo record
                        const photoRecord: ImageRecord = {
                            id: photoId,
                            url: downloadURL,
                            uploader,
                            tags,
                            timestamp: Date.now(),
                            pending: false,
                            deleted: false
                        };

                        // Save to Firestore
                        await setDoc(doc(db, 'photos', photoId), photoRecord);
                        console.log('Photo saved:', photoId);

                        onProgress?.({ progress: 100, state: 'success' });

                        // Dispatch event for UI updates
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('photoUploaded', { detail: photoRecord }));
                        }

                        resolve(photoRecord);
                    } catch (error: any) {
                        console.error('Error saving to Firestore:', error);
                        onProgress?.({ progress: 0, state: 'error', error: error.message });
                        reject(error);
                    }
                } else {
                    const error = `Upload failed: ${xhr.statusText}`;
                    console.error(error, xhr.responseText);
                    onProgress?.({ progress: 0, state: 'error', error });
                    reject(new Error(error));
                }
            });

            xhr.addEventListener('error', () => {
                const error = 'Upload failed: Network error';
                onProgress?.({ progress: 0, state: 'error', error });
                reject(new Error(error));
            });

            // Send to Cloudinary
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            xhr.open('POST', uploadUrl);
            xhr.send(formData);

        } catch (error: any) {
            console.error('Upload error:', error);
            onProgress?.({ progress: 0, state: 'error', error: error.message });
            reject(error);
        }
    });
}

/**
 * Update tags on a photo
 */
export async function updatePhotoTags(photoId: string, newTags: string[]): Promise<boolean> {
    try {
        await updateDoc(doc(db, 'photos', photoId), { tags: newTags });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoUpdated', { detail: { photoId, tags: newTags } }));
        }

        return true;
    } catch (error) {
        console.error('Error updating photo tags:', error);
        return false;
    }
}

/**
 * Soft delete a photo (mark as deleted, keep for undo window)
 */
export async function softDeletePhoto(photoId: string): Promise<boolean> {
    try {
        await updateDoc(doc(db, 'photos', photoId), { deleted: true });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoDeleted', { detail: { photoId } }));
        }

        return true;
    } catch (error) {
        console.error('Error soft-deleting photo:', error);
        return false;
    }
}

/**
 * Restore a soft-deleted photo (undo)
 */
export async function restorePhoto(photoId: string): Promise<boolean> {
    try {
        await updateDoc(doc(db, 'photos', photoId), { deleted: false });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoRestored', { detail: { photoId } }));
        }

        return true;
    } catch (error) {
        console.error('Error restoring photo:', error);
        return false;
    }
}

/**
 * Permanently delete a photo from Firestore
 * Note: Cloudinary deletion requires API secret (server-side only)
 */
export async function permanentlyDeletePhoto(photoId: string): Promise<boolean> {
    try {
        // Delete from Firestore only (Cloudinary deletion needs server-side API)
        await deleteDoc(doc(db, 'photos', photoId));
        return true;
    } catch (error) {
        console.error('Error deleting photo:', error);
        return false;
    }
}
