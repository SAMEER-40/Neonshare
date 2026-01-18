'use client';

import React, { useState, useCallback, useEffect } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search by @username or tag...' }: SearchBarProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Trigger search when debounced query changes
    useEffect(() => {
        onSearch(debouncedQuery);
    }, [debouncedQuery, onSearch]);

    const handleClear = useCallback(() => {
        setQuery('');
        onSearch('');
    }, [onSearch]);

    return (
        <div className={styles.container}>
            <div className={styles.searchIcon}>🔍</div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className={styles.input}
            />
            {query && (
                <button
                    className={styles.clearBtn}
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    ×
                </button>
            )}
        </div>
    );
}
