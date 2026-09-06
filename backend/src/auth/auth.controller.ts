import { Controller, Get, Headers } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@Headers('x-role') roleHeader?: string) {
    return {
      role: roleHeader ?? 'viewer',
      acceptedRoles: ['admin', 'analyst', 'operator', 'viewer'],
    };
  }
}
