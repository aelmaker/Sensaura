'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'analyst' | 'operator' | 'viewer';
  };
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
    [],
  );

  const endpoint = mode === 'login' ? 'login' : 'register';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          mode === 'login' ? { email, password } : { name, email, password },
        ),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string | string[] };
        const message = Array.isArray(body.message)
          ? body.message[0]
          : body.message;
        throw new Error(message ?? 'Auth failed');
      }

      const data = (await response.json()) as AuthResponse;
      localStorage.setItem('sensaura_token', data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ margin: '3rem auto', maxWidth: 420, fontFamily: 'Arial, sans-serif' }}>
      <h1>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h1>
      <p>
        {mode === 'login'
          ? 'Увійдіть для доступу до панелі.'
          : 'Створіть обліковий запис для доступу до панелі.'}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <button type="button" onClick={() => setMode('login')}>
          Вхід
        </button>
        <button type="button" onClick={() => setMode('register')}>
          Реєстрація
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
        {mode === 'register' && (
          <input
            placeholder="Ім'я"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль (мін. 6 символів)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Завантаження...' : mode === 'login' ? 'Увійти' : 'Зареєструватись'}
        </button>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </form>
    </main>
  );
}
