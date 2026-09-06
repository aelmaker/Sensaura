'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase, setTokens } from '@/lib/auth-client';

type Mode = 'login' | 'register';

type LoginResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
    refreshExpiresAt: string;
  };
};

type RegisterResponse = {
  verificationToken: string;
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const payload = mode === 'login' ? { email, password } : { name, email, password };

      const response = await fetch(`${getApiBase()}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as LoginResponse & RegisterResponse & { message?: string | string[] };
      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? 'Auth failed');
      }

      if (mode === 'register') {
        setVerificationToken(data.verificationToken);
        setMode('login');
        return;
      }

      setTokens(data.tokens);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (!verificationToken) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${getApiBase()}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string | string[] };
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(message ?? 'Verification failed');
      }

      setVerificationToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ margin: '3rem auto', maxWidth: 420, fontFamily: 'Arial, sans-serif' }}>
      <h1>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h1>
      <p>{mode === 'login' ? 'Увійдіть у панель.' : 'Створіть акаунт.'}</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => setMode('login')}>
          Вхід
        </button>
        <button type="button" onClick={() => setMode('register')}>
          Реєстрація
        </button>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
        {mode === 'register' ? (
          <input placeholder="Ім'я" value={name} onChange={(e) => setName(e.target.value)} required />
        ) : null}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Пароль (мін. 8)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'login' ? 'Увійти' : 'Зареєструватись'}
        </button>
      </form>
      {verificationToken ? (
        <section style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid #ccc' }}>
          <p>Verification token (demo): {verificationToken}</p>
          <button type="button" onClick={verifyEmail} disabled={loading}>
            Підтвердити email
          </button>
        </section>
      ) : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
    </main>
  );
}
