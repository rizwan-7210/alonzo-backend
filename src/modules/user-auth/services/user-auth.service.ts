import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from 'src/shared/repositories/user.repository';
import { PasswordResetRepository } from 'src/shared/repositories/password-reset.repository';
import { PasswordResetDocument } from 'src/shared/schemas/password-reset.schema';
import { EmailService } from 'src/common/services/email.service';
import { UserRole, UserStatus } from 'src/common/constants/user.constants';
import { sanitizeUserUtils } from 'src/common/utils/sanitize-user-utils';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UserAuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordResetRepository: PasswordResetRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) { }

    async register(registerDto: RegisterDto) {
        const { firstName, lastName, phone, dial_code, email, password, confirmPassword } = registerDto;

        // Validate password confirmation
        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        // Check if email already exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await this.userRepository.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            dial_code: dial_code?.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
        });

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        // Get user with profile image populated
        const userWithProfileImage = await this.userRepository.findByEmailWithProfileImage(email);
        if (userWithProfileImage) {
            await userWithProfileImage.populate('profileImageFile');
        }

        // Build response
        const sanitizedUser = sanitizeUserUtils.sanitizeUser(userWithProfileImage || user);
        return {
            user: sanitizedUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        // Find user with password
        const user = await this.userRepository.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is a USER role
        if (user.role !== UserRole.USER) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Your account is not active. Please contact support.');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        // Get user with profile image populated
        const userWithProfileImage = await this.userRepository.findByEmailWithProfileImage(email);
        if (userWithProfileImage) {
            await userWithProfileImage.populate('profileImageFile');
        }

        // Build response
        const sanitizedUser = sanitizeUserUtils.sanitizeUser(userWithProfileImage || user);
        return {
            user: sanitizedUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        // Validate email format
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        // Check if user exists and is USER role
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists or not for security
            return {
                message: 'If the email exists, a reset code has been sent.',
            };
        }

        // Check if user is USER role
        if (user.role !== UserRole.USER) {
            // Don't reveal role information
            return {
                message: 'If the email exists, a reset code has been sent.',
            };
        }

        // Check if user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }

        try {
            // Generate 4-6 digit numeric code
            const code = this.generateVerificationCode();
            
            // Hash the code before storing
            const hashedCode = await bcrypt.hash(code, 10);

            // Create reset token in database (store hashed code)
            await this.passwordResetRepository.createResetToken(email, hashedCode);

            // Send email with plain code
            const emailSent = await this.emailService.sendPasswordResetEmail(
                email,
                code,
                `${user.firstName} ${user.lastName}`
            );

            if (!emailSent) {
                throw new InternalServerErrorException('Failed to send reset code email. Please try again.');
            }

            // In development, return the code for testing
            const isDevelopment = this.configService.get('app.env') === 'development';

            return {
                message: 'A password reset code has been sent to your email.',
                emailSent: true,
                ...(isDevelopment && { debugCode: code }),
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to process password reset request');
        }
    }

    async verifyCode(verifyCodeDto: VerifyCodeDto) {
        const { email, token } = verifyCodeDto;

        // Validate inputs
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        if (!token || token.length < 4 || token.length > 6 || !this.isNumeric(token)) {
            throw new BadRequestException('Please provide a valid 4-6 digit verification code');
        }

        // Check if user exists and is USER role
        const user = await this.userRepository.findByEmail(email);
        if (!user || user.role !== UserRole.USER) {
            throw new BadRequestException('Invalid verification code');
        }

        // Find active reset tokens for this email
        const activeTokens = await this.passwordResetRepository.findActiveTokensByEmail(email);

        // Try to match the token by hashing and comparing
        let matchedToken: PasswordResetDocument | null = null;
        for (const resetToken of activeTokens) {
            try {
                const isMatch = await bcrypt.compare(token, resetToken.token);
                if (isMatch) {
                    matchedToken = resetToken;
                    break;
                }
            } catch (error) {
                // Continue to next token if comparison fails
                continue;
            }
        }

        if (!matchedToken) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        // Return success - token is verified
        return {
            message: 'Verification code is valid',
            email,
            token,
        };
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { email, token, password, passwordConfirmation } = resetPasswordDto;

        // Validate inputs
        if (!email || !this.isValidEmail(email)) {
            throw new BadRequestException('Please provide a valid email address');
        }

        if (!token || token.length < 4 || token.length > 6 || !this.isNumeric(token)) {
            throw new BadRequestException('Please provide a valid 4-6 digit verification code');
        }

        if (password !== passwordConfirmation) {
            throw new BadRequestException('Passwords do not match');
        }

        // Validate password strength
        if (!this.isStrongPassword(password)) {
            throw new BadRequestException(
                'Password must contain at least one uppercase letter, one number, and one special character'
            );
        }

        // Check if user exists and is USER role
        const user = await this.userRepository.findByEmailWithPassword(email);
        if (!user || user.role !== UserRole.USER) {
            throw new NotFoundException('User not found');
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new BadRequestException('Your account is not active. Please contact support.');
        }

        // Find active reset tokens for this email
        const activeTokens = await this.passwordResetRepository.findActiveTokensByEmail(email);

        let matchedToken: PasswordResetDocument | null = null;
        for (const resetToken of activeTokens) {
            try {
                const isMatch = await bcrypt.compare(token, resetToken.token);
                if (isMatch) {
                    matchedToken = resetToken;
                    break;
                }
            } catch (error) {
                // Continue to next token if comparison fails
                continue;
            }
        }

        if (!matchedToken) {
            throw new BadRequestException('Invalid or expired verification code');
        }

        // Check if new password is same as old password
        const isSamePassword = await bcrypt.compare(password, user.password);
        if (isSamePassword) {
            throw new BadRequestException('New password must be different from your current password');
        }

        try {
            // Hash new password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Update user password
            await this.userRepository.update(user._id.toString(), { password: hashedPassword });

            // Mark token as used by ID
            await this.passwordResetRepository.markTokenAsUsedById(matchedToken._id.toString());

            return {
                message: 'Password reset successfully',
            };
        } catch (error) {
            throw new InternalServerErrorException('Failed to reset password');
        }
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const { firstName, lastName, phone, dial_code } = updateProfileDto;

        // Check if user exists and is USER role
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.role !== UserRole.USER) {
            throw new UnauthorizedException('Unauthorized');
        }

        // Build update data
        const updateData: any = {};
        if (firstName !== undefined) {
            updateData.firstName = firstName.trim();
        }
        if (lastName !== undefined) {
            updateData.lastName = lastName.trim();
        }
        if (phone !== undefined) {
            updateData.phone = phone.trim();
        }
        if (dial_code !== undefined) {
            updateData.dial_code = dial_code.trim();
        }

        // Update user
        const updatedUser = await this.userRepository.update(userId, updateData);
        if (!updatedUser) {
            throw new NotFoundException('User not found');
        }

        // Get user with profile image populated
        const userWithProfileImage = await this.userRepository.findByIdWithProfileImage(userId);
        if (userWithProfileImage) {
            await userWithProfileImage.populate('profileImageFile');
        }

        // Build response
        const sanitizedUser = sanitizeUserUtils.sanitizeUser(userWithProfileImage || updatedUser);
        return {
            user: sanitizedUser,
        };
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

    private generateVerificationCode(): string {
        // Generate 4-6 digit code (randomly choose length)
        const length = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6 digits
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    private isNumeric(value: string): boolean {
        return /^\d+$/.test(value);
    }

    private isStrongPassword(password: string): boolean {
        // Min 8, Max 16 characters
        if (password.length < 8 || password.length > 16) {
            return false;
        }

        // At least one uppercase letter
        if (!/[A-Z]/.test(password)) {
            return false;
        }

        // At least one number
        if (!/[0-9]/.test(password)) {
            return false;
        }

        // At least one special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return false;
        }

        return true;
    }
}

