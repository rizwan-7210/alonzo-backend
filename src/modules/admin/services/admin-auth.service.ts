import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
// import { UserRepository } from '../../../../shared/repositories/user.repository';
import { AdminLoginDto } from '../dto/login.dto';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { UserRole } from 'src/common/constants/user.constants';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';

@Injectable()
export class AdminAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async login(loginDto: AdminLoginDto) {
        const { email, password } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is an admin
        if (user.role !== UserRole.ADMIN) {
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

        // Get user with profile image populated from files table
        const userWithProfileImage = await this.userRepository.findByEmailWithProfileImage(email);
        if (userWithProfileImage) {
            await userWithProfileImage.populate('profileImageFile');
        }

        // Build response object
        const sanitizedUser = sanitizeUserUtils.sanitizeUser(userWithProfileImage || user);
        return {
            user: sanitizedUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
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