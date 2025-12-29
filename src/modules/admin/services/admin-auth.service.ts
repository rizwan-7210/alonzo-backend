import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
// import { UserRepository } from '../../../../shared/repositories/user.repository';
import { AdminLoginDto } from '../dto/login.dto';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import { SubAdminPermissionRepository } from 'src/shared/repositories/sub-admin-permission.repository';
// import { UserRole } from '../../../../common/constants/user.constants';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly subAdminPermissionRepository: SubAdminPermissionRepository,
    ) { }

    async login(loginDto: AdminLoginDto) {
        const { email, password } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is an admin or sub-admin
        if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUB_ADMIN) {
            throw new UnauthorizedException('Insufficient permissions');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        // Get permissions if user is a sub-admin
        let permissionsData: { permissions: string[]; rights: string | null } | null = null;

        // Check role as string to handle both enum and string comparison
        const userRole = String(user.role);
        const isSubAdmin = userRole === UserRole.SUB_ADMIN || userRole === 'sub_admin';

        if (isSubAdmin) {
            try {
                const subAdminPermissions = await this.subAdminPermissionRepository.findBySubAdminId(user._id.toString());
                if (subAdminPermissions && subAdminPermissions.permissions) {
                    permissionsData = {
                        permissions: Array.isArray(subAdminPermissions.permissions)
                            ? subAdminPermissions.permissions
                            : [],
                        rights: subAdminPermissions.rights || null,
                    };
                } else {
                    // Return empty permissions if no record exists
                    permissionsData = {
                        permissions: [],
                        rights: null,
                    };
                }
            } catch (error) {
                // If error fetching permissions, return empty permissions
                permissionsData = {
                    permissions: [],
                    rights: null,
                };
            }
        }

        // Build response object - always include permissions field explicitly
        const sanitizedUser = sanitizeUserUtils.sanitizeUser(user);
        const response: Record<string, any> = {
            user: sanitizedUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };

        // Always set permissions field - null for admin, object for sub-admin
        if (isSubAdmin) {
            response.permissions = permissionsData || { permissions: [], rights: null };
        } else {
            response.permissions = null;
        }

        return response;
    }

    async logout(userId: string) {
        return this.userRepository.updateRefreshToken(userId, null);
    }

    private async generateTokens(userId: string, email: string, role: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: this.configService.get('jwt.secret'), expiresIn: this.configService.get('jwt.expiresIn') },
            ),
            this.jwtService.signAsync(
                { sub: userId, email, role },
                { secret: this.configService.get('jwt.refreshSecret'), expiresIn: this.configService.get('jwt.refreshExpiresIn') },
            ),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }
}