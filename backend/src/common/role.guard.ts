import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      query?: Record<string, unknown>;
      user?: { id: string; role: Role };
    }>();

    const tokenHeader = request.headers['x-access-token'];
    const headerToken = Array.isArray(tokenHeader)
      ? tokenHeader[0]
      : tokenHeader;
    const queryToken = request?.query?.accessToken;
    const accessToken =
      headerToken ?? (typeof queryToken === 'string' ? queryToken : undefined);

    if (!accessToken) {
      throw new UnauthorizedException('missing x-access-token');
    }

    const user = await this.authService.getUserByAccessToken(accessToken);
    if (!user) {
      throw new UnauthorizedException('invalid access token');
    }

    request.user = { id: user.id, role: user.role };

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('insufficient role');
    }

    return true;
  }
}
