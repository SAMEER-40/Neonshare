/**
 * Component tests for SearchBar
 * Tests debouncing, clear functionality, and rendering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SearchBar from '@/components/SearchBar';

describe('SearchBar', () => {
    const mockOnSearch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should render with default placeholder', () => {
        render(<SearchBar onSearch={mockOnSearch} />);
        expect(screen.getByPlaceholderText('Search by @username or tag...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
        render(<SearchBar onSearch={mockOnSearch} placeholder="Find photos..." />);
        expect(screen.getByPlaceholderText('Find photos...')).toBeInTheDocument();
    });

    it('should debounce search input by 300ms', async () => {
        render(<SearchBar onSearch={mockOnSearch} />);
        const input = screen.getByPlaceholderText('Search by @username or tag...');

        // Type quickly
        fireEvent.change(input, { target: { value: 'a' } });
        fireEvent.change(input, { target: { value: 'al' } });
        fireEvent.change(input, { target: { value: 'ali' } });
        fireEvent.change(input, { target: { value: 'alic' } });
        fireEvent.change(input, { target: { value: 'alice' } });

        // Should not have called with intermediate values
        // Initial call happens with '' on mount
        const callCountBeforeTimer = mockOnSearch.mock.calls.filter(
            (call: any[]) => call[0] !== ''
        ).length;
        expect(callCountBeforeTimer).toBe(0);

        // Advance timer past debounce
        await act(async () => {
            vi.advanceTimersByTime(350);
        });

        // Should have called with final value
        expect(mockOnSearch).toHaveBeenCalledWith('alice');
    });

    it('should show clear button when there is input', () => {
        render(<SearchBar onSearch={mockOnSearch} />);
        const input = screen.getByPlaceholderText('Search by @username or tag...');

        // No clear button initially
        expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

        // Type something
        fireEvent.change(input, { target: { value: 'test' } });

        // Clear button should appear
        expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should clear input and trigger search on clear button click', async () => {
        render(<SearchBar onSearch={mockOnSearch} />);
        const input = screen.getByPlaceholderText('Search by @username or tag...');

        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.click(screen.getByLabelText('Clear search'));

        expect(input).toHaveValue('');
        expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('should hide clear button after clearing', () => {
        render(<SearchBar onSearch={mockOnSearch} />);
        const input = screen.getByPlaceholderText('Search by @username or tag...');

        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.click(screen.getByLabelText('Clear search'));

        expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
});
