/**
 * ErrorBoundary
 * Catches React errors and displays a friendly fallback UI.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={styles.container}>
                    <div className={styles.icon}>⚠️</div>
                    <h2 className={styles.title}>Something went wrong</h2>
                    <p className={styles.message}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button className={styles.retryBtn} onClick={this.handleRetry}>
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
