'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStatus } from '@/lib/AuthProvider';
import { Camera, Lock, Image, Heart, ArrowRight, Sparkles } from 'lucide-react';
import styles from './Landing.module.css';

/* ── Design tokens ───────────────────────────────────────────── */
const C = {
    linen: '#f0ece4',
    linenSoft: '#f5f2ec',
    sage: '#cfdbd5',
    gold: '#e8b931',
    goldSoft: 'rgba(232, 185, 49, 0.12)',
    goldGlow: 'rgba(232, 185, 49, 0.25)',
    ink: '#1a1a18',
    inkSoft: '#2d2d2a',
    bark: '#4a4a46',
    stone: '#8a8a84',
    border: 'rgba(26, 26, 24, 0.08)',
    borderStrong: 'rgba(26, 26, 24, 0.14)',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceRaised: 'rgba(255, 255, 255, 0.72)',
};

const heading: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
const body: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

/* ── Reusable primitives ─────────────────────────────────────── */
function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span style={{
            ...body,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            border: `1px solid ${C.border}`,
            background: C.surfaceRaised,
            color: C.bark, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
        }}>
            {children}
        </span>
    );
}

function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...heading,
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '15px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: C.ink, color: C.linen, fontWeight: 600, fontSize: 15,
                boxShadow: hover
                    ? '0 8px 32px rgba(26, 26, 24, 0.20), 0 2px 8px rgba(26, 26, 24, 0.12)'
                    : '0 4px 16px rgba(26, 26, 24, 0.12), 0 1px 4px rgba(26, 26, 24, 0.08)',
                transform: hover ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                letterSpacing: '-0.01em',
            }}
        >
            {children}
        </button>
    );
}

function SecondaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                ...body,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 12, cursor: 'pointer',
                background: hover ? C.surfaceRaised : C.surface,
                border: `1px solid ${hover ? C.borderStrong : C.border}`,
                color: C.ink, fontWeight: 500, fontSize: 15,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                letterSpacing: '-0.01em',
            }}
        >
            {children}
        </button>
    );
}

/* ── Fade-up on mount ────────────────────────────────────────── */
function useFadeUp(delay = 0) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        const t = setTimeout(() => {
            el.style.transition = `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 30);
        return () => clearTimeout(t);
    }, [delay]);
    return ref;
}

/* ── Scroll reveal ───────────────────────────────────────────── */
function FadeInView({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    el.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 50);
                observer.disconnect();
            }
        }, { threshold: 0.15, rootMargin: '-30px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);
    return <div ref={ref}>{children}</div>;
}

/* ── Features ────────────────────────────────────────────────── */
const FEATURES = [
    { Icon: Lock, title: 'Invite-only rooms', desc: 'Your photos stay between the people you choose. No public feeds, no discovery algorithms.' },
    { Icon: Image, title: 'Full-quality uploads', desc: 'Zero compression, zero degradation. Every pixel preserved exactly as you shot it.' },
    { Icon: Heart, title: 'Reactions & comments', desc: 'Real-time reactions that let your friends experience the moment with you.' },
];

const GALLERY_TILES: { icon: string; large?: boolean }[] = [
    { icon: '', large: true },
    { icon: '' },
    { icon: '' },
    { icon: '' },
    { icon: '' },
];

/* ── Landing page ────────────────────────────────────────────── */
export default function Landing() {
    const router = useRouter();
    const { authStatus } = useAuthStatus();

    useEffect(() => {
        if (authStatus === 'authenticated') router.push('/home');
    }, [authStatus, router]);

    const heroRef = useFadeUp(0);
    const gallRef = useFadeUp(200);

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            background: `linear-gradient(175deg, ${C.linenSoft} 0%, ${C.linen} 40%, #e5e1d8 100%)`,
            color: C.ink, position: 'relative', overflow: 'hidden',
        }}>

            {/* Subtle radial gradient accent */}
            <div aria-hidden style={{
                position: 'absolute', top: '-20%', right: '-10%',
                width: '60%', height: '80%',
                background: 'radial-gradient(ellipse at center, rgba(232, 185, 49, 0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Grain texture overlay */}
            <div aria-hidden style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                opacity: 0.015, mixBlendMode: 'overlay',
            }} />

            {/* ── Navbar ─────────────────────────────────────────── */}
            <header className={styles.navbar} style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(240, 236, 228, 0.75)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
                borderBottom: `1px solid ${C.border}`,
            }}>
                <span style={{
                    ...heading, fontWeight: 700, fontSize: 18, color: C.ink,
                    letterSpacing: '-0.03em',
                }}>
                    NeonShare
                </span>
                <SecondaryBtn onClick={() => router.push('/login')}>Sign in</SecondaryBtn>
            </header>

            {/* ── Hero ───────────────────────────────────────────── */}
            <main className={styles.heroMain} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
            }}>
                <div className={styles.heroGrid}>

                    {/* Copy column */}
                    <div ref={heroRef} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        <div>
                            <Badge>
                                <Sparkles size={12} strokeWidth={2} style={{ color: C.gold }} />
                                Private photo sharing
                            </Badge>
                        </div>

                        <h1 style={{
                            ...heading,
                            fontSize: 'clamp(2.5rem, 5.5vw, 3.75rem)',
                            fontWeight: 700, lineHeight: 1.05,
                            letterSpacing: '-0.035em', color: C.ink, margin: 0,
                        }}>
                            Share moments,{' '}
                            <br />
                            <span style={{
                                background: `linear-gradient(135deg, ${C.ink} 30%, ${C.gold})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>
                                on your terms.
                            </span>
                        </h1>

                        <p style={{
                            ...body, fontSize: 17, lineHeight: 1.7, color: C.bark,
                            maxWidth: 460, margin: 0, letterSpacing: '-0.01em',
                        }}>
                            A calm, intimate space to share photos with the people who matter.
                            No algorithms, no noise, no compression.
                        </p>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 4 }}>
                            <PrimaryBtn onClick={() => router.push('/register')}>
                                <Camera size={16} strokeWidth={2} />
                                Get started
                                <ArrowRight size={14} strokeWidth={2} />
                            </PrimaryBtn>
                            <SecondaryBtn onClick={() => router.push('/login')}>Sign in</SecondaryBtn>
                        </div>

                        {/* Metric pills */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                            {[
                                { value: 'Zero ads', sub: 'No clutter, ever' },
                                { value: 'Invite-only', sub: 'Real connections' },
                                { value: 'Full quality', sub: 'No compression' },
                            ].map(({ value, sub }) => (
                                <div key={sub} style={{
                                    display: 'flex', flexDirection: 'column', gap: 2,
                                    padding: '12px 18px', borderRadius: 14,
                                    background: C.surface,
                                    border: `1px solid ${C.border}`,
                                }}>
                                    <span style={{ ...heading, fontWeight: 600, fontSize: 13, color: C.ink, letterSpacing: '-0.01em' }}>{value}</span>
                                    <span style={{ ...body, fontSize: 11, color: C.stone }}>{sub}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual column — preview card */}
                    <div ref={gallRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            borderRadius: 24, padding: 24,
                            border: `1px solid ${C.border}`,
                            background: C.surfaceRaised,
                            boxShadow: '0 8px 40px rgba(26, 26, 24, 0.06), 0 2px 8px rgba(26, 26, 24, 0.04)',
                        }}>
                            {/* Card header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <p style={{ ...heading, fontWeight: 600, fontSize: 16, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>Weekend Walks</p>
                                    <p style={{ ...body, fontSize: 13, color: C.stone, marginTop: 4 }}>12 photos &middot; updated today</p>
                                </div>
                                <Badge>Friends</Badge>
                            </div>

                            {/* Grid mockup */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto', gap: 10 }}>
                                {GALLERY_TILES.map(({ icon, large }, i) => (
                                    <div key={i} style={{
                                        gridRow: large ? 'span 2' : undefined,
                                        height: large ? 180 : 84,
                                        borderRadius: 16,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 24,
                                        background: i % 2 === 0
                                            ? `linear-gradient(145deg, ${C.goldSoft}, rgba(207, 219, 213, 0.25))`
                                            : `linear-gradient(145deg, rgba(207, 219, 213, 0.35), rgba(240, 236, 228, 0.4))`,
                                        border: `1px solid ${C.border}`,
                                        transform: i === 1 ? 'translateY(-3px)' : i === 3 ? 'translateY(3px)' : undefined,
                                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    }}>
                                        {icon}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Note card */}
                        <div style={{
                            padding: '18px 22px', borderRadius: 20,
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                        }}>
                            <p style={{ ...heading, fontWeight: 600, fontSize: 13, color: C.ink, marginBottom: 8 }}>Today</p>
                            <p style={{ ...body, fontSize: 13, color: C.bark, lineHeight: 1.7 }}>
                                Shared a sunrise photo and a few candid shots from the trail. Everyone can add their own views.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%', background: C.gold,
                                    boxShadow: `0 0 0 3px ${C.goldGlow}`,
                                    display: 'inline-block',
                                }} />
                                <span style={{ ...body, fontSize: 12, color: C.stone }}>Live reactions</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Features ───────────────────────────────────────── */}
            <section className={styles.section} style={{
                borderTop: `1px solid ${C.border}`,
                background: 'rgba(245, 242, 236, 0.5)',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <FadeInView>
                        <p style={{
                            ...body, textAlign: 'center',
                            fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
                            textTransform: 'uppercase' as const, color: C.stone, marginBottom: 48,
                        }}>
                            Designed for people who care about their memories
                        </p>
                    </FadeInView>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                        {FEATURES.map(({ Icon, title, desc }, i) => (
                            <FadeInView key={title} delay={i * 100}>
                                <FeatureCard Icon={Icon} title={title} desc={desc} />
                            </FadeInView>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────── */}
            <section className={styles.section} style={{
                borderTop: `1px solid ${C.border}`,
                textAlign: 'center',
            }}>
                <FadeInView>
                    <div style={{ maxWidth: 560, margin: '0 auto' }}>
                        <h2 style={{
                            ...heading, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                            fontWeight: 700, letterSpacing: '-0.03em', color: C.ink,
                            marginBottom: 16, lineHeight: 1.1,
                        }}>
                            Ready to start sharing?
                        </h2>
                        <p style={{ ...body, fontSize: 16, color: C.bark, lineHeight: 1.7, marginBottom: 32 }}>
                            Create your private space in seconds. Invite your people and start preserving what matters.
                        </p>
                        <PrimaryBtn onClick={() => router.push('/register')}>
                            <Camera size={16} strokeWidth={2} />
                            Create your space
                            <ArrowRight size={14} strokeWidth={2} />
                        </PrimaryBtn>
                    </div>
                </FadeInView>
            </section>

            {/* ── Footer ─────────────────────────────────────────── */}
            <footer className={styles.footer} style={{
                borderTop: `1px solid ${C.border}`,
                display: 'flex', flexWrap: 'wrap',
                alignItems: 'center', justifyContent: 'space-between',
                gap: 16,
            }}>
                <span style={{ ...heading, fontWeight: 700, fontSize: 14, color: C.ink, letterSpacing: '-0.02em' }}>NeonShare</span>
                <p style={{ ...body, fontSize: 12, color: C.stone }}>Built for photographers &amp; small teams. No ads, ever.</p>
                <div style={{ display: 'flex', gap: 20 }}>
                    {['Privacy', 'Terms'].map(l => (
                        <a key={l} href="#" style={{
                            ...body, fontSize: 12, color: C.stone, textDecoration: 'none',
                            transition: 'color 0.15s',
                        }}>{l}</a>
                    ))}
                </div>
            </footer>
        </div>
    );
}

/* ── Feature card with hover ─────────────────────────────────── */
function FeatureCard({ Icon, title, desc }: { Icon: React.ElementType; title: string; desc: string }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                borderRadius: 20,
                border: `1px solid ${hover ? C.borderStrong : C.border}`,
                background: hover ? C.surfaceRaised : C.surface,
                boxShadow: hover
                    ? '0 8px 32px rgba(26, 26, 24, 0.06), 0 2px 8px rgba(26, 26, 24, 0.04)'
                    : '0 2px 8px rgba(26, 26, 24, 0.03)',
                padding: 28, height: '100%',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hover ? 'translateY(-2px)' : 'translateY(0)',
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: C.goldSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, color: C.ink,
                border: `1px solid ${C.border}`,
            }}>
                <Icon size={18} strokeWidth={1.75} />
            </div>
            <p style={{ ...heading, fontWeight: 600, fontSize: 16, color: C.ink, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</p>
            <p style={{ ...body, fontSize: 14, color: C.bark, lineHeight: 1.7 }}>{desc}</p>
        </div>
    );
}
