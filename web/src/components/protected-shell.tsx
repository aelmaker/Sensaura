'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, clearTokens, getAccessToken } from '@/lib/auth-client';
import type { AuthUser } from '@/lib/auth-client';

export function ProtectedShell({ title, children }: { title: string; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth');
      return;
    }

    apiFetch('/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unauthorized');
        }
        const me = (await response.json()) as AuthUser;
        setUser(me);
        setReady(true);
      })
      .catch(() => {
        clearTokens();
        router.replace('/auth');
      });
  }, [router]);

  const logout = () => {
    const refreshToken = localStorage.getItem('sensaura_refresh_token');
    void apiFetch('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    clearTokens();
    router.replace('/auth');
  };

  if (!ready || !user) {
    return <main style={{ margin: '3rem', fontFamily: 'Arial, sans-serif' }}>Loading...</main>;
  }

  const linkStyle = (href: string): CSSProperties => ({
    textDecoration: pathname === href ? 'underline' : 'none',
  });

  return (
    <main style={{ margin: '2rem auto', maxWidth: 980, fontFamily: 'Arial, sans-serif' }}>
      <h1>{title}</h1>
      <p>
        {user.name} ({user.role})
      </p>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/dashboard" style={linkStyle('/dashboard')}>
          Dashboard
        </Link>
        <Link href="/devices" style={linkStyle('/devices')}>
          Devices
        </Link>
        <Link href="/campaigns" style={linkStyle('/campaigns')}>
          Campaigns
        </Link>
        <Link href="/interactions" style={linkStyle('/interactions')}>
          Interactions
        </Link>
        <Link href="/analytics" style={linkStyle('/analytics')}>
          Analytics
        </Link>
      </nav>
      <button type="button" onClick={logout} style={{ marginBottom: '1rem' }}>
        Logout
      </button>
      {children}
    </main>
  );
}
