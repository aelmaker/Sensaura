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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
