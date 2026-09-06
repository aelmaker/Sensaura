export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'operator' | 'viewer';
  emailVerified: boolean;
};

const ACCESS_KEY = 'sensaura_access_token';
const REFRESH_KEY = 'sensaura_refresh_token';

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export async function refreshTokens(): Promise<AuthTokens | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const payload = (await response.json()) as { tokens: AuthTokens };
  setTokens(payload.tokens);
  return payload.tokens;
}

export async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers ?? {});

  if (accessToken) {
    headers.set('x-access-token', accessToken);
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      return response;
    }

    return apiFetch(path, init, false);
  }

  return response;
}
