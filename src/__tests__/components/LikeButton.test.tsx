/**
 * Component tests for LikeButton
 * Tests optimistic UI, rate limiting, and error revert.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LikeButton from '@/components/LikeButton';

describe('LikeButton', () => {
    const mockToggle = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockToggle.mockResolvedValue(undefined);
    });

    it('should render with unlike state', () => {
        render(<LikeButton isLiked={false} count={0} onToggle={mockToggle} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Like');
        expect(screen.getByText('🤍')).toBeInTheDocument();
    });

    it('should render with liked state', () => {
        render(<LikeButton isLiked={true} count={3} onToggle={mockToggle} />);
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Unlike');
        expect(screen.getByText('❤️')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not show count when 0', () => {
        render(<LikeButton isLiked={false} count={0} onToggle={mockToggle} />);
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should optimistically update on click', async () => {
        // Make toggle hang so we can check optimistic state
        mockToggle.mockReturnValue(new Promise(() => {}));

        render(<LikeButton isLiked={false} count={5} onToggle={mockToggle} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        // Optimistic: should show liked with count 6
        expect(screen.getByText('❤️')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('should revert on toggle error', async () => {
        mockToggle.mockRejectedValueOnce(new Error('Network error'));

        render(<LikeButton isLiked={false} count={5} onToggle={mockToggle} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        // Should revert to original state
        await waitFor(() => {
            expect(screen.getByText('🤍')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    it('should rate limit rapid clicks', async () => {
        render(<LikeButton isLiked={false} count={0} onToggle={mockToggle} />);
        const button = screen.getByRole('button');

        await act(async () => {
            fireEvent.click(button);
        });

        // Immediate second click should be ignored (rate limit)
        await act(async () => {
            fireEvent.click(button);
        });

        // Only one call should have been made
        expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        render(<LikeButton isLiked={false} count={0} onToggle={mockToggle} disabled={true} />);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should disable button while toggle is pending', async () => {
        mockToggle.mockReturnValue(new Promise(() => {})); // Never resolves

        render(<LikeButton isLiked={false} count={0} onToggle={mockToggle} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button'));
        });

        expect(screen.getByRole('button')).toBeDisabled();
    });
});
