import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { VendorLoginDto } from '../dto/login.dto';
import { VendorRegisterDto } from '../dto/register.dto';
import { UserRole, UserStatus } from '../../../common/constants/user.constants';
import { sanitizeUserUtils } from '../../../common/utils/sanitize-user-utils';
import { StripeService } from '../../../common/services/stripe.service';
import { NotificationService } from 'src/modules/notification/services/notification.service';
import { FileRepository } from 'src/shared/repositories/file.repository';
import { FileType, FileCategory } from '../../../common/constants/file.constants';
import { Types } from "mongoose";

@Injectable()
export class VendorAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly fileRepository: FileRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly stripeService: StripeService,
        private readonly notificationService: NotificationService,
    ) { }

    async register(registerDto: VendorRegisterDto, avatar?: Express.Multer.File) {
        const { email, password, confirmPassword, firstName, lastName, phone, address } = registerDto;

        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create vendor - explicitly set to VENDOR role
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            address,
            role: UserRole.VENDOR, // Explicitly set to VENDOR role
        });

        // Create Stripe customer
        try {
            const stripeCustomerId = await this.stripeService.createCustomer(
                email.toLowerCase(),
                `${firstName} ${lastName}`,
            );
            // Update user with Stripe customer ID
            await this.userRepository.update(user._id.toString(), { stripeCustomerId });
        } catch (error) {
            // Continue even if Stripe customer creation fails
            console.warn('Failed to create Stripe customer for vendor:', error);
        }

        // Save avatar if uploaded
        if (avatar) {
            const savedFile = await this.fileRepository.create({
                name: avatar.filename,
                originalName: avatar.originalname,
                path: avatar.filename,
                mimeType: avatar.mimetype,
                size: avatar.size,
                type: FileType.IMAGE,
                category: FileCategory.AVATAR,
                fileableId: new Types.ObjectId(user._id),
                fileableType: 'User',
                uploadedBy: new Types.ObjectId(user._id),
            });

            // update user avatar path
            await this.userRepository.update(user._id.toString(), { avatar: savedFile.path });
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

    async login(loginDto: VendorLoginDto) {
        const { email, password } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is a vendor
        if (user.role !== UserRole.VENDOR) {
            throw new UnauthorizedException('Access denied. Vendor account required.');
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
            try {
                const stripeCustomerId = await this.stripeService.createCustomer(
                    user.email,
                    `${user.firstName} ${user.lastName}`,
                );
                await this.userRepository.update(user._id.toString(), { stripeCustomerId });
            } catch (error) {
                // Continue even if Stripe customer creation fails
                console.warn('Failed to create Stripe customer for vendor:', error);
            }
        }

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);
        const updatedUser = await this.userRepository.findByEmailWithAvatar(email);

        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser),
            ...tokens,
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

