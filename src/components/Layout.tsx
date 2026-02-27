'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStatus, useAuthActions } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';
import { prefetchPhotos } from '@/lib/data/photo.store';
import { Users, Home, User, LogOut } from 'lucide-react';

const C = {
    linen: '#f0ece4',
    linenSoft: '#f5f2ec',
    ink: '#1a1a18',
    inkSoft: '#2d2d2a',
    bark: '#4a4a46',
    stone: '#8a8a84',
    gold: '#e8b931',
    border: 'rgba(26, 26, 24, 0.08)',
    borderStrong: 'rgba(26, 26, 24, 0.14)',
    surface: 'rgba(255, 255, 255, 0.55)',
};

const heading: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const body: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

function NavBtn({ onClick, href, children, prefetch }: {
    onClick?: () => void;
    href?: string;
    children: React.ReactNode;
    prefetch?: boolean;
}) {
    const [hover, setHover] = useState(false);
    const style: React.CSSProperties = {
        ...body,
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
        background: hover ? 'rgba(26, 26, 24, 0.05)' : 'transparent',
        border: 'none', color: hover ? C.ink : C.bark,
        fontWeight: 500, fontSize: 13.5, textDecoration: 'none',
        transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        letterSpacing: '-0.01em',
    };
    if (href) {
        return (
            <Link href={href} prefetch={prefetch} style={style}
                onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                {children}
            </Link>
        );
    }
    return (
        <button onClick={onClick} style={style}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {children}
        </button>
    );
}

function LogoutBtn({ onClick }: { onClick: () => void }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...body,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'transparent',
                border: `1px solid ${hover ? C.borderStrong : C.border}`,
                color: hover ? C.ink : C.bark,
                fontWeight: 500, fontSize: 13.5,
                transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                letterSpacing: '-0.01em',
            }}
        >
            <LogOut size={13} strokeWidth={1.75} />
            <span>Logout</span>
        </button>
    );
}

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
    const { user } = useAuthStatus();
    const { logout } = useAuthActions();
    const router = useRouter();

    const handleLogout = () => { logout(); router.push('/login'); };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh',
            background: `linear-gradient(175deg, ${C.linenSoft} 0%, ${C.linen} 50%, #e5e1d8 100%)`,
            color: C.ink,
        }}>
            {/* Navbar — premium glassmorphism */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 40px',
                background: 'rgba(240, 236, 228, 0.72)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                borderBottom: `1px solid ${C.border}`,
            }}>
                <Link
                    href="/home"
                    onMouseEnter={prefetchPhotos}
                    prefetch={true}
                    style={{
                        ...heading, fontWeight: 700, fontSize: 17, color: C.ink,
                        textDecoration: 'none', letterSpacing: '-0.03em',
                    }}
                >
                    NeonShare
                </Link>

                {user && (
                    <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <NavBtn href="/home" prefetch={true}>
                            <Home size={14} strokeWidth={1.75} />
                            <span>Feed</span>
                        </NavBtn>
                        <NavBtn href="/friends" prefetch={true}>
                            <Users size={14} strokeWidth={1.75} />
                            <span>Friends</span>
                        </NavBtn>
                        <NavBtn href="/profile" prefetch={true}>
                            <User size={14} strokeWidth={1.75} />
                            <span>@{user}</span>
                        </NavBtn>
                        <div style={{ width: 1, height: 20, background: C.border, margin: '0 6px' }} />
                        <LogoutBtn onClick={handleLogout} />
                    </nav>
                )}
            </header>

            {/* Main content */}
            <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1400, width: '100%', margin: '0 auto' }}>
                {children}
            </main>
        </div>
    );
}
