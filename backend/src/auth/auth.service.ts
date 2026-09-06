import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { Role } from '../common/roles.decorator';
import type { AuthSession, AuthUser, LoginDto, RegisterDto } from './auth.types';

interface StoredUser extends AuthUser {
  salt: string;
  passwordHash: string;
}

@Injectable()
export class AuthService {
  private readonly users = new Map<string, StoredUser>();
  private readonly sessions = new Map<string, string>();
  private readonly roles: Role[] = ['admin', 'analyst', 'operator', 'viewer'];

  register(input: RegisterDto): AuthSession {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();
    const name = input.name?.trim() || 'Sensaura User';
    const role = input.role ?? 'viewer';

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    if (password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }

    if (!this.roles.includes(role)) {
      throw new BadRequestException('invalid role');
    }

    const existing = this.findByEmail(email);
    if (existing) {
      throw new ConflictException('user already exists');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user: StoredUser = {
      id: randomBytes(8).toString('hex'),
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash,
    };

    this.users.set(user.id, user);
    return this.createSession(user);
  }

  login(input: LoginDto): AuthSession {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    const computedHash = this.hashPassword(password, user.salt);
    const isValid = timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      Buffer.from(computedHash, 'hex'),
    );

    if (!isValid) {
      throw new UnauthorizedException('invalid credentials');
    }

    return this.createSession(user);
  }

  me(tokenHeader?: string, authorizationHeader?: string): AuthUser {
    const token = this.extractToken(tokenHeader, authorizationHeader);

    if (!token) {
      throw new UnauthorizedException('missing bearer token');
    }

    const userId = this.sessions.get(token);
    if (!userId) {
      throw new UnauthorizedException('invalid token');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new UnauthorizedException('invalid token');
    }

    return this.toAuthUser(user);
  }

  resolveRole(
    tokenHeader?: string,
    authorizationHeader?: string,
    fallbackRole?: string,
  ): Role | undefined {
    const token = this.extractToken(tokenHeader, authorizationHeader);
    if (token) {
      const userId = this.sessions.get(token);
      const user = userId ? this.users.get(userId) : undefined;
      return user?.role;
    }

    if (fallbackRole && this.roles.includes(fallbackRole as Role)) {
      return fallbackRole as Role;
    }

    return undefined;
  }

  private createSession(user: StoredUser): AuthSession {
    const token = randomBytes(24).toString('hex');
    this.sessions.set(token, user.id);
    return {
      token,
      user: this.toAuthUser(user),
    };
  }

  private toAuthUser(user: StoredUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private findByEmail(email: string): StoredUser | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }

    return undefined;
  }

  private extractToken(
    tokenHeader?: string,
    authorizationHeader?: string,
  ): string | undefined {
    if (tokenHeader) {
      return tokenHeader;
    }

    if (!authorizationHeader) {
      return undefined;
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
      return undefined;
    }

    return token;
  }

  private hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 64).toString('hex');
  }
}
