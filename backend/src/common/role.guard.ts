import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
    const role = (headerRole ??
      (typeof queryRole === 'string' ? queryRole : undefined)) as
      Role | undefined;

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Missing or invalid x-role header');
    }

    return true;
  }
}
