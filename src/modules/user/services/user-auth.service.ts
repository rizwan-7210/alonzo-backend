import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UserStatus, UserRole } from '../../../common/constants/user.constants';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { FileType, FileCategory, FileSubType } from '../../../common/constants/file.constants';
import { Types } from "mongoose";
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import { StripeService } from 'src/common/services/stripe.service';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
        private readonly stripeService: StripeService,
    ) { }

    async register(registerDto: RegisterDto, profileImage?: Express.Multer.File) {
        const { email, password, confirmPassword, firstName, lastName, phone, address } = registerDto;

        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user first - only USER role allowed for public registration
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            address,
            role: UserRole.USER, // Explicitly set to USER role
        });

        // Create Stripe customer
        const stripeCustomerId = await this.stripeService.createCustomer(
            email.toLowerCase(),
            `${firstName} ${lastName}`,
        );

        // Update user with Stripe customer ID
        await this.userRepository.update(user._id.toString(), { stripeCustomerId });

        // Save profile image if uploaded
        if (profileImage) {
            const savedFile = await this.fileRepository.create({
                name: profileImage.filename,
                originalName: profileImage.originalname,
                path: profileImage.filename,
                mimeType: profileImage.mimetype,
                size: profileImage.size,
                type: FileType.IMAGE,
                category: FileCategory.PROFILE,
                subType: FileSubType.PROFILE_IMAGE,
                fileableId: new Types.ObjectId(user._id),
                fileableType: 'User',
                uploadedBy: new Types.ObjectId(user._id),
                isActive: true,
            });

            // Update user with profile image reference
            await this.userRepository.update(user._id.toString(), { profileImage: savedFile._id });
        }

        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        await this.notificationService.notifyNewUserRegistration({
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);

        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is a regular user (not vendor or admin)
        if (user.role !== UserRole.USER) {
            throw new UnauthorizedException('Access denied. Please use the appropriate login endpoint for your account type.');
        }

        // Check if user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Ensure Stripe customer exists
        if (!user.stripeCustomerId) {
            const stripeCustomerId = await this.stripeService.createCustomer(
                user.email,
                `${user.firstName} ${user.lastName}`,
            );
            await this.userRepository.update(user._id.toString(), { stripeCustomerId });
        }

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);
        
        // Get user with profile image populated from files table
        const userWithProfileImage = await this.userRepository.findByEmailWithProfileImage(email);
        if (userWithProfileImage) {
            await userWithProfileImage.populate('profileImageFile');
        }

        return {
            user: sanitizeUserUtils.sanitizeUser(userWithProfileImage || user),
            ...tokens,
        };
    }

    async logout(userId: string) {
        return this.userRepository.updateRefreshToken(userId, null);
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // In a real application, you might want to verify the refresh token here
        // For now, we'll just check if it matches
        if (user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Refresh token mismatch');
        }

        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        return tokens;
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