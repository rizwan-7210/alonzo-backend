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
import { FileType, FileCategory, FileSubType } from '../../../common/constants/file.constants';
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

    async register(
        registerDto: VendorRegisterDto,
        profileImage?: Express.Multer.File,
        pharmacyLicense?: Express.Multer.File,
        registrationCertificate?: Express.Multer.File,
    ) {
        const { email, password, confirmPassword, firstName, lastName, phone, dial_code, address, location, website, categoryId } = registerDto;

        if (password !== confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        // Validate required files for vendor registration
        if (!profileImage) {
            throw new BadRequestException('Profile image is required');
        }
        if (!pharmacyLicense) {
            throw new BadRequestException('Pharmacy license is required');
        }
        if (!registrationCertificate) {
            throw new BadRequestException('Registration certificate is required');
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Normalize website URL - add https:// if protocol is missing
        let normalizedWebsite = website?.trim();
        if (normalizedWebsite && !normalizedWebsite.match(/^https?:\/\//i)) {
            normalizedWebsite = `https://${normalizedWebsite}`;
        }

        // Create vendor - explicitly set to VENDOR role
        const user = await this.userRepository.create({
            email: email.toLowerCase(),
            firstName,
            lastName,
            password: hashedPassword,
            phone,
            dial_code,
            address,
            location,
            website: normalizedWebsite,
            categoryId: categoryId ? new Types.ObjectId(categoryId) : undefined,
            role: UserRole.VENDOR, // Explicitly set to VENDOR role
        });

        // Create Stripe customer
        try {
            const fullName = lastName ? `${firstName} ${lastName}` : firstName;
            const stripeCustomerId = await this.stripeService.createCustomer(
                email.toLowerCase(),
                fullName,
            );
            // Update user with Stripe customer ID
            await this.userRepository.update(user._id.toString(), { stripeCustomerId });
        } catch (error) {
            // Continue even if Stripe customer creation fails
            console.warn('Failed to create Stripe customer for vendor:', error);
        }

        const userId = new Types.ObjectId(user._id);

        // Save profile image
        const profileImageFile = await this.fileRepository.create({
            name: profileImage.filename,
            originalName: profileImage.originalname,
            path: profileImage.filename,
            mimeType: profileImage.mimetype,
            size: profileImage.size,
            type: FileType.IMAGE,
            category: FileCategory.PROFILE,
            subType: FileSubType.PROFILE_IMAGE,
            fileableId: userId,
            fileableType: 'User',
            uploadedBy: userId,
            isActive: true,
        });

        // Save pharmacy license
        await this.fileRepository.create({
            name: pharmacyLicense.filename,
            originalName: pharmacyLicense.originalname,
            path: pharmacyLicense.filename,
            mimeType: pharmacyLicense.mimetype,
            size: pharmacyLicense.size,
            type: FileType.DOCUMENT,
            category: FileCategory.DOCUMENT,
            subType: FileSubType.PHARMACY_LICENSE,
            fileableId: userId,
            fileableType: 'User',
            uploadedBy: userId,
            isActive: true,
        });

        // Save registration certificate
        await this.fileRepository.create({
            name: registrationCertificate.filename,
            originalName: registrationCertificate.originalname,
            path: registrationCertificate.filename,
            mimeType: registrationCertificate.mimetype,
            size: registrationCertificate.size,
            type: FileType.DOCUMENT,
            category: FileCategory.DOCUMENT,
            subType: FileSubType.REGISTRATION_CERTIFICATE,
            fileableId: userId,
            fileableType: 'User',
            uploadedBy: userId,
            isActive: true,
        });

        // Update user with profile image reference
        await this.userRepository.update(user._id.toString(), {
            profileImage: profileImageFile._id,
        });

        const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
        await this.userRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

        await this.notificationService.notifyNewUserRegistration({
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        });

        // Get user with profile image and category populated
        const updatedUser = await this.userRepository.findById(user._id.toString());
        if (updatedUser) {
            await updatedUser.populate('profileImageFile');
            await updatedUser.populate('category');
        }

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
        
        // Get user with profile image populated
        const updatedUser = await this.userRepository.findByEmailWithProfileImage(email);
        if (updatedUser) {
            await updatedUser.populate('profileImageFile');
        }

        // Fetch pharmacyLicense and registrationCertificate files for vendors
        let pharmacyLicense: any = null;
        let registrationCertificate: any = null;
        
        if (user.role === UserRole.VENDOR) {
            const userId = user._id.toString();
            const userFiles = await this.fileRepository.findByEntity(userId, 'User');
            
            // Find pharmacy license file
            const licenseFile = userFiles.find(
                (file) => {
                    const fileObj = file.toObject ? file.toObject() : file;
                    return fileObj.subType === FileSubType.PHARMACY_LICENSE && fileObj.isActive !== false;
                }
            );
            
            // Find registration certificate file
            const certificateFile = userFiles.find(
                (file) => {
                    const fileObj = file.toObject ? file.toObject() : file;
                    return fileObj.subType === FileSubType.REGISTRATION_CERTIFICATE && fileObj.isActive !== false;
                }
            );
            
            if (licenseFile) {
                pharmacyLicense = licenseFile;
            }
            
            if (certificateFile) {
                registrationCertificate = certificateFile;
            }
        }

        return {
            user: sanitizeUserUtils.sanitizeUser(updatedUser, undefined, pharmacyLicense, registrationCertificate),
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

