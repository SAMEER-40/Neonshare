/**
 * ToastManager
 * Simple toast notification system for user feedback.
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import styles from './ToastManager.module.css';

// Types
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    duration?: number;
}

interface ToastContextValue {
    showToast: (toast: Omit<Toast, 'id'>) => string;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className={styles.container} aria-live="polite" role="status">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${styles[toast.type]}`}
                        role={toast.type === 'error' ? 'alert' : undefined}
                    >
                        <span className={styles.message}>{toast.message}</span>
                        {toast.action && (
                            <button
                                className={styles.action}
                                onClick={() => {
                                    toast.action!.onClick();
                                    hideToast(toast.id);
                                }}
                            >
                                {toast.action.label}
                            </button>
                        )}
                        <button
                            className={styles.close}
                            onClick={() => hideToast(toast.id)}
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
