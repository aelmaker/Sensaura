import type { Role } from '../common/roles.decorator';

export interface RegisterDto {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
}

export interface LoginDto {
  email?: string;
  password?: string;
}

export interface RefreshDto {
  refreshToken?: string;
}

export interface VerifyEmailDto {
  token?: string;
}

export interface ResetPasswordRequestDto {
  email?: string;
}

export interface ResetPasswordConfirmDto {
  token?: string;
  newPassword?: string;
}

export interface RevokeSessionDto {
  sessionId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export interface AuthSessionPayload {
  user: AuthUser;
  tokens: AuthTokens;
  sessionId: string;
}
