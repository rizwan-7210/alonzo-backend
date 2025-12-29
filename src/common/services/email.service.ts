import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;
    private isConfigured = false;

    constructor(private configService: ConfigService) {
        this.initializeTransporter();
    }

    private async initializeTransporter() {
        // Resolve app name (prefer Nest config, then APP_NAME env)
        const appNameFromConfig = this.configService.get<string>('app.name');
        const appNameEnv = process.env.APP_NAME;
        const resolvedAppName = appNameFromConfig || appNameEnv || 'Cms Plumber';

        // Use the same environment variable names as Laravel
        const mailConfig = {
            host: process.env.MAIL_HOST || 'smtppro.zoho.com',
            port: parseInt(process.env.MAIL_PORT || "587", 10),
            secure: process.env.MAIL_ENCRYPTION === 'tls' ? false : true,
            auth: {
                user: process.env.MAIL_USERNAME || process.env.EMAIL_USER,
                pass: process.env.MAIL_PASSWORD || process.env.EMAIL_PASSWORD,
            },
            from: process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM,
            // If MAIL_FROM_NAME is literally '${APP_NAME}', treat it as placeholder and use resolvedAppName
            fromName: (
                process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_NAME !== '${APP_NAME}'
                    ? process.env.MAIL_FROM_NAME
                    : resolvedAppName
            ),
        };

        this.logger.debug(`📧 Laravel-style Mail Configuration:`);
        this.logger.debug(`   MAIL_HOST: ${mailConfig.host}`);
        this.logger.debug(`   MAIL_PORT: ${mailConfig.port}`);
        this.logger.debug(`   MAIL_USERNAME: ${mailConfig.auth.user}`);
        this.logger.debug(`   MAIL_ENCRYPTION: ${process.env.MAIL_ENCRYPTION}`);
        this.logger.debug(`   MAIL_FROM: ${mailConfig.from}`);

        // Check if mail configuration exists
        if (!mailConfig.auth.user || !mailConfig.auth.pass) {
            this.logger.error('❌ Mail credentials missing! Please set MAIL_USERNAME and MAIL_PASSWORD environment variables.');
            this.isConfigured = false;
            return;
        }

        try {
            // Match Laravel's Zoho configuration exactly
            this.transporter = nodemailer.createTransport({
                host: mailConfig.host,
                port: mailConfig.port,
                secure: mailConfig.port === 465, // true for 465, false for 587
                auth: {
                    user: mailConfig.auth.user,
                    pass: mailConfig.auth.pass,
                },
                // Zoho-specific settings that match Laravel
                tls: {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: false
                },
                // Important: Zoho requires specific connection settings
                requireTLS: true,
                ignoreTLS: false
            });

            // Verify connection configuration
            this.logger.log('🔧 Testing Zoho Mail connection with Laravel configuration...');
            await this.transporter.verify();
            this.logger.log('✅ Zoho Mail transporter is ready to send messages');
            this.isConfigured = true;

        } catch (error) {
            this.logger.error('❌ Failed to initialize Zoho Mail transporter:', error.message);
            this.logger.error('🔍 Full error:', error);

            // Try alternative Zoho configuration
            await this.tryZohoAlternatives(mailConfig);
        }
    }

    private async tryZohoAlternatives(mailConfig: any) {
        this.logger.log('🔄 Trying alternative Zoho configurations...');

        const alternatives = [
            {
                name: 'Zoho with SSL',
                config: {
                    host: 'smtp.zoho.com',
                    port: 465,
                    secure: true,
                    auth: mailConfig.auth,
                    tls: { rejectUnauthorized: false }
                }
            },
            {
                name: 'Zoho with STARTTLS',
                config: {
                    host: 'smtp.zoho.com',
                    port: 587,
                    secure: false,
                    auth: mailConfig.auth,
                    requireTLS: true,
                    tls: { rejectUnauthorized: false }
                }
            },
            {
                name: 'Zoho Europe',
                config: {
                    host: 'smtp.zoho.eu',
                    port: 587,
                    secure: false,
                    auth: mailConfig.auth,
                    requireTLS: true,
                    tls: { rejectUnauthorized: false }
                }
            }
        ];

        for (const alt of alternatives) {
            try {
                this.logger.log(`   Trying: ${alt.name}...`);
                this.transporter = nodemailer.createTransport(alt.config);
                await this.transporter.verify();
                this.logger.log(`✅ Success with ${alt.name}!`);
                this.isConfigured = true;
                return;
            } catch (altError) {
                this.logger.log(`   ❌ ${alt.name} failed: ${altError.message}`);
            }
        }

        this.logger.error('❌ All Zoho configurations failed');
        this.isConfigured = false;
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.error('❌ Email service not configured. Cannot send email.');
            return false;
        }

        const appNameFromConfig = this.configService.get<string>('app.name');
        const appNameEnv = process.env.APP_NAME;
        const resolvedAppName = appNameFromConfig || appNameEnv || 'Cms Plumber';

        const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.EMAIL_FROM;
        const fromName = (
            process.env.MAIL_FROM_NAME && process.env.MAIL_FROM_NAME !== '${APP_NAME}'
                ? process.env.MAIL_FROM_NAME
                : resolvedAppName
        );
        const from = `"${fromName}" <${fromAddress}>`;

        const mailOptions = {
            from: from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };

        try {
            this.logger.log(`📧 Attempting to send email to: ${options.to}`);
            this.logger.log(`📝 Subject: ${options.subject}`);
            this.logger.log(`📨 From: ${from}`);

            const result = await this.transporter.sendMail(mailOptions);

            this.logger.log(`✅ Email sent successfully to ${options.to}`);
            this.logger.log(`📨 Message ID: ${result.messageId}`);
            this.logger.log(`📊 Response: ${result.response}`);

            return true;
        } catch (error) {
            this.logger.error(`❌ Failed to send email to ${options.to}`);
            this.logger.error(`🔍 Error details: ${error.message}`);
            this.logger.error(`⚡ Error code: ${error.code}`);

            if (error.response) {
                this.logger.error(`📨 SMTP Response: ${error.response}`);
            }

            return false;
        }
    }

    // Template for password reset email
    async sendPasswordResetEmail(email: string, token: string, userName: string = 'User'): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.warn('Email service not configured. Cannot send password reset email.');
            // For development, log the token so you can still test
            this.logger.log(`🔑 Password Reset Token for ${email}: ${token}`);
            return false;
        }

        const appName = process.env.MAIL_FROM_NAME || 'Cms Plumber';
        const subject = `Password Reset Code - ${appName}`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; }
        .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 30px 0; padding: 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; letter-spacing: 8px; font-family: monospace; }
        .warning { background: #fef3cd; border: 1px solid #fde047; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #4F46E5; margin: 0;">${appName}</h1>
            <h2 style="color: #6b7280; margin: 10px 0 0 0;">Password Reset Request</h2>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        <p>You requested a password reset for your account. Use the verification code below to reset your password:</p>
        
        <div class="code">${token}</div>
        
        <p>This code will expire in <strong style="color: #dc2626;">15 minutes</strong>.</p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email and ensure your account is secure.
        </div>
        
        <p>Need help? Contact our support team for assistance.</p>
        
        <div class="footer">
            <p>This email was sent from ${appName}</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

        const text = `
Password Reset Code - ${appName}

Hello ${userName},

You requested a password reset for your account. Use the verification code below to reset your password:

Verification Code: ${token}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
`;

        return this.sendEmail({
            to: email,
            subject,
            html,
            text,
        });
    }

    // Template for password reset success email
    async sendPasswordResetSuccessEmail(email: string, userName: string = 'User'): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.warn('Email service not configured. Cannot send success email.');
            return false;
        }

        const appName = process.env.MAIL_FROM_NAME || 'Cms Plumber';
        const subject = `Password Reset Successful - ${appName}`;

        const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="color: #10b981; font-size: 48px; margin-bottom: 20px;">✓</div>
        <h1 style="color: #10b981; margin: 0;">Password Reset Successful</h1>
    </div>
    
    <p>Hello <strong>${userName}</strong>,</p>
    
    <p>Your password has been successfully reset at ${new Date().toLocaleString()}.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong>🔒 Security Notice:</strong> For your security, all active sessions have been logged out.
    </div>
    
    <p>If you did not make this change, please contact our support team immediately.</p>
    
    <p>Thank you for helping us keep your account secure.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #6b7280; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
</div>`;

        return this.sendEmail({
            to: email,
            subject,
            html,
        });
    }

    // Check if email service is available
    isEmailServiceAvailable(): boolean {
        return this.isConfigured;
    }
}