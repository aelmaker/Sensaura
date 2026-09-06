import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Roles } from '../common/roles.decorator';
import { AuthService } from './auth.service';
import type {
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordConfirmDto,
  ResetPasswordRequestDto,
  RevokeSessionDto,
  VerifyEmailDto,
} from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body);
    await this.auditService.log('auth.register', 'auth', result.user.id, {
      email: result.user.email,
    });
    return result;
  }

  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    await this.auditService.log('auth.login', 'auth', result.user.id, {
      sessionId: result.sessionId,
    });
    return result;
  }

  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  async logout(
    @Headers('x-access-token') accessToken?: string,
    @Body() body?: RefreshDto,
  ) {
    const me = await this.authService.getUserByAccessToken(accessToken);
    const result = await this.authService.logout(
      accessToken,
      body?.refreshToken,
    );
    await this.auditService.log('auth.logout', 'auth', me?.id);
    return result;
  }

  @Post('revoke')
  @Roles('admin')
  async revoke(
    @Headers('x-access-token') accessToken?: string,
    @Body() body?: RevokeSessionDto,
  ) {
    const me = await this.authService.me(accessToken);
    const result = await this.authService.revoke(body ?? {}, me.role);
    await this.auditService.log('auth.revoke', 'auth', me.id, {
      sessionId: body?.sessionId,
    });
    return result;
  }

  @Post('reset-password/request')
  requestReset(@Body() body: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(body);
  }

  @Post('reset-password/confirm')
  confirmReset(@Body() body: ResetPasswordConfirmDto) {
    return this.authService.confirmPasswordReset(body);
  }

  @Get('me')
  me(@Headers('x-access-token') accessToken?: string) {
    return this.authService.me(accessToken);
  }
}
