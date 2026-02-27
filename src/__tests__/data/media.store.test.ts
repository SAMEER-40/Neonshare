/**
 * Unit tests for media.store
 * Tests file validation logic.
 */

import { describe, it, expect } from 'vitest';
import { validateImage } from '@/lib/data/media.store';

// Helper to create mock File objects
function createMockFile(name: string, size: number, type: string): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type });
}

describe('media.store', () => {
    describe('validateImage', () => {
        it('should accept JPEG files', () => {
            const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
            expect(validateImage(file)).toEqual({ valid: true });
        });

        it('should accept PNG files', () => {
            const file = createMockFile('photo.png', 1024, 'image/png');
            expect(validateImage(file)).toEqual({ valid: true });
        });

        it('should accept GIF files', () => {
            const file = createMockFile('photo.gif', 1024, 'image/gif');
            expect(validateImage(file)).toEqual({ valid: true });
        });

        it('should accept WebP files', () => {
            const file = createMockFile('photo.webp', 1024, 'image/webp');
            expect(validateImage(file)).toEqual({ valid: true });
        });

        it('should reject non-image file types', () => {
            const pdf = createMockFile('doc.pdf', 1024, 'application/pdf');
            expect(validateImage(pdf).valid).toBe(false);
            expect(validateImage(pdf).error).toContain('Invalid file type');

            const video = createMockFile('vid.mp4', 1024, 'video/mp4');
            expect(validateImage(video).valid).toBe(false);

            const text = createMockFile('file.txt', 1024, 'text/plain');
            expect(validateImage(text).valid).toBe(false);
        });

        it('should reject SVG files', () => {
            const svg = createMockFile('icon.svg', 1024, 'image/svg+xml');
            expect(validateImage(svg).valid).toBe(false);
        });

        it('should reject files larger than 10MB', () => {
            const bigFile = createMockFile('huge.jpg', 11 * 1024 * 1024, 'image/jpeg');
            expect(validateImage(bigFile).valid).toBe(false);
            expect(validateImage(bigFile).error).toContain('too large');
        });

        it('should accept files exactly at 10MB', () => {
            const file = createMockFile('exact.jpg', 10 * 1024 * 1024, 'image/jpeg');
            expect(validateImage(file)).toEqual({ valid: true });
        });

        it('should accept very small files', () => {
            const tiny = createMockFile('tiny.png', 1, 'image/png');
            expect(validateImage(tiny)).toEqual({ valid: true });
        });
    });
});
