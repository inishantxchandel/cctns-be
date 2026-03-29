import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { Permission } from '../permissions/permission.enum';
import { rolesForPermission } from '../permissions/role-policies';
import type { AuthUser } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (permission === undefined) {
      return true;
    }

    const allowedRoles = rolesForPermission(permission);
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Missing role on authenticated user');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission for this action');
    }

    return true;
  }
}
