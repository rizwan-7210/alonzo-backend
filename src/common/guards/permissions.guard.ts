import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserRole, Permission } from '../constants/user.constants';
import { SubAdminPermissionRepository } from '../../shared/repositories/sub-admin-permission.repository';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly subAdminPermissionRepository: SubAdminPermissionRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no permissions are required, allow access
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('User not authenticated');
        }

        // Admins have all permissions
        if (user.role === UserRole.ADMIN) {
            return true;
        }

        // For sub-admins, check if they have the required permissions
        if (user.role === UserRole.SUB_ADMIN) {
            const subAdminPermissions = await this.subAdminPermissionRepository.findBySubAdminId(user.id);
            
            if (!subAdminPermissions || !subAdminPermissions.permissions) {
                throw new ForbiddenException('Insufficient permissions');
            }

            // Check if sub-admin has at least one of the required permissions
            const hasPermission = requiredPermissions.some(requiredPerm => 
                subAdminPermissions.permissions.includes(requiredPerm)
            );

            if (!hasPermission) {
                throw new ForbiddenException('Insufficient permissions');
            }

            return true;
        }

        // For other roles, deny access
        throw new ForbiddenException('Insufficient permissions');
    }
}

