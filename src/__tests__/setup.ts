import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Firebase — prevents real Firestore connections in tests
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
    storage: {},
    googleProvider: {},
    analytics: undefined,
    hasFirebaseConfig: true,
}));

// Mock CSS modules — returns class names as-is
vi.mock('*.module.css', () => new Proxy({}, {
    get: (_target, prop) => prop,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.subtle for password hashing
Object.defineProperty(globalThis, 'crypto', {
    value: {
        subtle: {
            digest: vi.fn(async (_algo: string, data: ArrayBuffer) => {
                // Simple mock hash — returns predictable bytes for testing
                const bytes = new Uint8Array(data as ArrayBuffer);
                const hash = new Uint8Array(32);
                for (let i = 0; i < bytes.length; i++) {
                    hash[i % 32] ^= bytes[i];
                }
                return hash.buffer;
            }),
        },
        getRandomValues: (arr: Uint8Array) => {
            for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
            return arr;
        },
    },
});
