import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RolesService } from '../../roles/roles.service';
import { RequestWithUserInterface } from '@/common/interfaces/request-inteface';
import type {
  RoleEntity,
  RolePermissions,
} from '../../roles/entities/role.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserInterface>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRoles = await this.rolesService.getUserRoles(user.id);

    if (!userRoles || userRoles.length === 0) {
      throw new ForbiddenException('User has no assigned roles');
    }

    const hasPermission = requiredPermissions.some((permission) =>
      this.checkPermission(userRoles, permission),
    );

    if (!hasPermission) {
      /* throw new ForbiddenException(
        `You do not have permission to perform this action. Required: ${requiredPermissions.join(' or ')}`,
      ); */
      throw new ForbiddenException(
        `You do not have permission to perform this action.`,
      );
    }

    return true;
  }

  private checkPermission(roles: RoleEntity[], permission: string): boolean {
    /*     console.log('permission', permission);
    console.log('roles', roles); */
    const [category, action] = permission.split('.');

    return roles.some((role) => {
      if (!role.isActive || !role.permissions) {
        return false;
      }

      const permissions = role.permissions;
      const categoryPermissions =
        permissions[category as keyof RolePermissions];

      if (!categoryPermissions) {
        return false;
      }

      return (categoryPermissions as Record<string, boolean>)[action] === true;
    });
  }
}
