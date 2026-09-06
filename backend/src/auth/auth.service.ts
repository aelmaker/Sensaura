import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import type { Role } from '../common/roles.decorator';
import { DatabaseService } from '../database/database.service';
import type {
  AuthSessionPayload,
  AuthTokens,
  AuthUser,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordConfirmDto,
  ResetPasswordRequestDto,
  RevokeSessionDto,
  VerifyEmailDto,
} from './auth.types';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_salt: string;
  password_hash: string;
  email_verified: boolean;
  created_at: Date;
};

type SessionUserRow = {
  session_id: string;
  user_id: string;
  access_expires_at: Date;
  refresh_expires_at: Date;
  revoked_at: Date | null;
  user_email: string;
  user_name: string;
  user_role: Role;
  user_email_verified: boolean;
  user_created_at: Date;
};

@Injectable()
export class AuthService {
  private readonly roles: Role[] = ['admin', 'analyst', 'operator', 'viewer'];

  constructor(private readonly databaseService: DatabaseService) {}

  async register(
    input: RegisterDto,
  ): Promise<{ user: AuthUser; verificationToken: string }> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();
    const name = input.name?.trim() || 'Sensaura User';
    const role = input.role ?? 'viewer';

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }
    if (!this.roles.includes(role)) {
      throw new BadRequestException('invalid role');
    }

    const existing = await this.databaseService.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new ConflictException('user already exists');
    }

    const verificationToken = randomBytes(24).toString('hex');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const result = await this.databaseService.query<UserRow>(
      `INSERT INTO users (id, email, name, role, password_salt, password_hash, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, password_salt, password_hash, email_verified, created_at`,
      [randomUUID(), email, name, role, salt, passwordHash, verificationToken],
    );

    const user = result.rows[0];
    if (!user) {
      throw new Error('user creation failed');
    }

    return { user: this.toAuthUser(user), verificationToken };
  }

  async verifyEmail(input: VerifyEmailDto): Promise<{ status: string }> {
    const token = input.token?.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }

    const result = await this.databaseService.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verification_token = NULL,
           updated_at = NOW()
       WHERE email_verification_token = $1`,
      [token],
    );

    if (!result.rowCount) {
      throw new NotFoundException('verification token not found');
    }

    return { status: 'verified' };
  }

  async login(input: LoginDto): Promise<AuthSessionPayload> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const result = await this.databaseService.query<UserRow>(
      `SELECT id, email, name, role, password_salt, password_hash, email_verified, created_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    const computedHash = this.hashPassword(password, user.password_salt);
    const validPassword = timingSafeEqual(
      Buffer.from(user.password_hash, 'hex'),
      Buffer.from(computedHash, 'hex'),
    );

    if (!validPassword) {
      throw new UnauthorizedException('invalid credentials');
    }
    if (!user.email_verified) {
      throw new ForbiddenException('email is not verified');
    }

    return this.createSession(user);
  }

  async refresh(input: RefreshDto): Promise<AuthSessionPayload> {
    const refreshToken = input.refreshToken?.trim();
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    const result = await this.databaseService.query<SessionUserRow>(
      `SELECT
         s.id AS session_id,
         s.user_id,
         s.access_expires_at,
         s.refresh_expires_at,
         s.revoked_at,
         u.email AS user_email,
         u.name AS user_name,
         u.role AS user_role,
         u.email_verified AS user_email_verified,
         u.created_at AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
       LIMIT 1`,
      [this.hashToken(refreshToken)],
    );

    const row = result.rows[0];
    if (!row || row.revoked_at || new Date(row.refresh_expires_at) < new Date()) {
      throw new UnauthorizedException('invalid refresh token');
    }

    await this.databaseService.query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [
      row.session_id,
    ]);

    const user: UserRow = {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      role: row.user_role,
      email_verified: row.user_email_verified,
      created_at: row.user_created_at,
      password_salt: '',
      password_hash: '',
    };

    return this.createSession(user);
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<{ status: string }> {
    if (!accessToken && !refreshToken) {
      throw new BadRequestException('token is required');
    }

    const result = await this.databaseService.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE revoked_at IS NULL
         AND (
           ($1::text IS NOT NULL AND access_token_hash = $1)
           OR ($2::text IS NOT NULL AND refresh_token_hash = $2)
         )`,
      [accessToken ? this.hashToken(accessToken) : null, refreshToken ? this.hashToken(refreshToken) : null],
    );

    if (!result.rowCount) {
      throw new NotFoundException('session not found');
    }

    return { status: 'logged_out' };
  }

  async revoke(input: RevokeSessionDto, currentRole: Role): Promise<{ status: string }> {
    if (currentRole !== 'admin') {
      throw new ForbiddenException('admin role is required');
    }

    const sessionId = input.sessionId?.trim();
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }

    const result = await this.databaseService.query(
      'UPDATE sessions SET revoked_at = NOW() WHERE id = $1',
      [sessionId],
    );

    if (!result.rowCount) {
      throw new NotFoundException('session not found');
    }

    return { status: 'revoked' };
  }

  async requestPasswordReset(
    input: ResetPasswordRequestDto,
  ): Promise<{ status: string; resetToken: string }> {
    const email = input.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('email is required');
    }

    const resetToken = randomBytes(24).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const result = await this.databaseService.query(
      `UPDATE users
       SET reset_password_token = $1,
           reset_password_expires_at = $2,
           updated_at = NOW()
       WHERE email = $3`,
      [resetToken, resetExpiresAt, email],
    );

    if (!result.rowCount) {
      throw new NotFoundException('user not found');
    }

    return {
      status: 'reset_requested',
      resetToken,
    };
  }

  async confirmPasswordReset(input: ResetPasswordConfirmDto): Promise<{ status: string }> {
    const token = input.token?.trim();
    const newPassword = input.newPassword?.trim();

    if (!token || !newPassword) {
      throw new BadRequestException('token and newPassword are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('newPassword must be at least 8 characters');
    }

    const userResult = await this.databaseService.query<
      UserRow & { reset_password_expires_at: Date | null }
    >(
      `SELECT id, email, name, role, password_salt, password_hash, email_verified, created_at, reset_password_expires_at
       FROM users
       WHERE reset_password_token = $1
       LIMIT 1`,
      [token],
    );

    const user = userResult.rows[0];
    if (
      !user ||
      !user.reset_password_expires_at ||
      new Date(user.reset_password_expires_at) < new Date()
    ) {
      throw new UnauthorizedException('invalid or expired reset token');
    }

    const salt = randomBytes(16).toString('hex');
    const hash = this.hashPassword(newPassword, salt);

    await this.databaseService.query(
      `UPDATE users
       SET password_salt = $1,
           password_hash = $2,
           reset_password_token = NULL,
           reset_password_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $3`,
      [salt, hash, user.id],
    );

    await this.databaseService.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1', [
      user.id,
    ]);

    return { status: 'password_reset' };
  }

  async me(accessToken?: string): Promise<AuthUser> {
    const user = await this.getUserByAccessToken(accessToken);
    if (!user) {
      throw new UnauthorizedException('invalid access token');
    }

    return user;
  }

  async resolveRole(accessToken?: string): Promise<Role | undefined> {
    const user = await this.getUserByAccessToken(accessToken);
    return user?.role;
  }

  async getUserByAccessToken(accessToken?: string): Promise<AuthUser | null> {
    if (!accessToken) {
      return null;
    }

    const result = await this.databaseService.query<SessionUserRow>(
      `SELECT
         s.id AS session_id,
         s.user_id,
         s.access_expires_at,
         s.refresh_expires_at,
         s.revoked_at,
         u.email AS user_email,
         u.name AS user_name,
         u.role AS user_role,
         u.email_verified AS user_email_verified,
         u.created_at AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.access_token_hash = $1
       LIMIT 1`,
      [this.hashToken(accessToken)],
    );

    const row = result.rows[0];
    if (!row || row.revoked_at || new Date(row.access_expires_at) < new Date()) {
      return null;
    }

    return {
      id: row.user_id,
      email: row.user_email,
      name: row.user_name,
      role: row.user_role,
      emailVerified: row.user_email_verified,
      createdAt: row.user_created_at.toISOString(),
    };
  }

  private async createSession(user: UserRow): Promise<AuthSessionPayload> {
    const sessionId = randomUUID();
    const tokens = this.generateTokens();

    await this.databaseService.query(
      `INSERT INTO sessions
         (id, user_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        user.id,
        this.hashToken(tokens.accessToken),
        this.hashToken(tokens.refreshToken),
        tokens.accessExpiresAt,
        tokens.refreshExpiresAt,
      ],
    );

    return {
      sessionId,
      user: this.toAuthUser(user),
      tokens,
    };
  }

  private toAuthUser(
    user: Pick<UserRow, 'id' | 'email' | 'name' | 'role' | 'email_verified' | 'created_at'>,
  ): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at.toISOString(),
    };
  }

  private generateTokens(): AuthTokens {
    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return {
      accessToken: randomBytes(32).toString('hex'),
      refreshToken: randomBytes(32).toString('hex'),
      accessExpiresAt: accessExpiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  private hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 64).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
