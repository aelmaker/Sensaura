import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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

  canActivate(context: ExecutionContext): boolean {
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
    }>();

    const roleHeader = request.headers['x-role'];
    const headerRole = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
    const queryRole = request?.query?.role;
    const authorization = request.headers.authorization;
    const authHeader = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    const tokenHeader = request.headers['x-auth-token'];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;

    const role = this.authService.resolveRole(
      token,
      authHeader,
      headerRole ?? (typeof queryRole === 'string' ? queryRole : undefined),
    );

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Missing or invalid role');
    }

    return true;
  }
}
