import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ZoomService {
    private readonly logger = new Logger(ZoomService.name);
    private readonly zoomAccountId: string; // Account ID (from ZOOM_API_KEY env var)
    private readonly zoomClientId: string; // Client ID (from ZOOM_API_SECRET env var)
    private readonly zoomClientSecret: string; // Client Secret (from ZOOM_ACCOUNT_ID env var)
    private readonly axiosInstance: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(private readonly configService: ConfigService) {
        // Based on the working curl command:
        // - ZOOM_API_KEY = Account ID (goes in URL)
        // - ZOOM_API_SECRET = Client ID (goes in Basic Auth)
        // - ZOOM_ACCOUNT_ID = Client Secret (goes in Basic Auth)
        this.zoomAccountId = this.configService.get<string>('zoom.apiKey') || ''; // Account ID from ZOOM_API_KEY
        this.zoomClientId = this.configService.get<string>('zoom.apiSecret') || ''; // Client ID from ZOOM_API_SECRET
        this.zoomClientSecret = this.configService.get<string>('zoom.accountId') || ''; // Client Secret from ZOOM_ACCOUNT_ID

        // Log credential status (without exposing actual values)
        if (this.zoomAccountId && this.zoomClientId && this.zoomClientSecret) {
            this.logger.log('Zoom API credentials loaded successfully');
            this.logger.debug(`Zoom Account ID: ${this.zoomAccountId.substring(0, 4)}...`);
            this.logger.debug(`Zoom Client ID length: ${this.zoomClientId.length}`);
            this.logger.debug(`Zoom Client Secret length: ${this.zoomClientSecret.length}`);
        } else {
            this.logger.warn('Zoom API credentials not fully configured');
            this.logger.debug(`Account ID present: ${!!this.zoomAccountId}, Client ID present: ${!!this.zoomClientId}, Client Secret present: ${!!this.zoomClientSecret}`);
        }

        this.axiosInstance = axios.create({
            baseURL: 'https://api.zoom.us/v2',
            timeout: 10000,
        });
    }

    /**
     * Generate a Zoom meeting link for a booking
     * Creates an actual Zoom meeting via API if credentials are configured
     * Falls back to a simple link format if API is unavailable
     */
    async createMeetingLink(bookingId: string, date: Date, duration: number = 60): Promise<string> {
        // Check if Zoom API credentials are configured
        if (!this.zoomAccountId || !this.zoomClientId || !this.zoomClientSecret) {
            this.logger.warn('Zoom API credentials not fully configured. Cannot create real Zoom meetings.');
            throw new Error('Zoom API credentials are not configured. Please set ZOOM_API_KEY (Account ID), ZOOM_API_SECRET (Client ID), and ZOOM_ACCOUNT_ID (Client Secret) in your .env file.');
        }

        // Validate that credentials are not placeholder values
        if (this.zoomAccountId.includes('your_') || this.zoomClientId.includes('your_') || this.zoomClientSecret.includes('your_')) {
            this.logger.error('Zoom API credentials appear to be placeholder values. Please replace with actual credentials.');
            throw new Error('Zoom API credentials are set to placeholder values. Please update ZOOM_API_KEY, ZOOM_API_SECRET, and ZOOM_ACCOUNT_ID in your .env file with actual values from your Zoom app.');
        }

        try {
            // Use Zoom API to create actual meeting
            return await this.createZoomMeetingViaAPI(bookingId, date, duration);
        } catch (error: any) {
            this.logger.error(`Failed to create Zoom meeting link for booking ${bookingId}: ${error.message}`);
            // Re-throw the error so caller knows it failed
            // Don't create fake meeting IDs - they won't work
            throw error;
        }
    }

    /**
     * Get or refresh Zoom access token using Server-to-Server OAuth
     * Uses Account-level credentials (Account ID, Client ID, Client Secret)
     */
    private async getAccessToken(): Promise<string> {
        // Check if we have a valid token
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            // TypeScript type narrowing: we know accessToken is not null here
            return this.accessToken as string;
        }

        try {
            this.logger.debug(`Requesting Zoom access token with account_id: ${this.zoomAccountId}`);

            // Create Basic Auth header using Client ID and Client Secret
            // Format: base64(client_id:client_secret)
            const credentials = Buffer.from(`${this.zoomClientId}:${this.zoomClientSecret}`).toString('base64');

            // Request access token using Server-to-Server OAuth
            // For account credentials, account_id should be in the URL query string
            const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(this.zoomAccountId)}`;

            this.logger.debug(`Sending OAuth request to Zoom: ${tokenUrl.replace(this.zoomAccountId, '***')}`);

            const response = await axios.post(
                tokenUrl,
                {}, // Empty body for account_credentials grant type
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const accessToken = response.data.access_token;
            if (!accessToken) {
                throw new Error('No access token received from Zoom API');
            }

            this.accessToken = accessToken;
            // Set expiry to 50 minutes (tokens expire in 1 hour, refresh early)
            this.tokenExpiry = Date.now() + (50 * 60 * 1000);

            this.logger.log('Zoom access token obtained successfully');
            return accessToken;
        } catch (error: any) {
            const errorData = error.response?.data || {};
            const errorMessage = error.response?.data?.reason || error.response?.data?.error || error.message;

            this.logger.error('Failed to get Zoom access token:', {
                error: errorMessage,
                fullResponse: errorData,
                status: error.response?.status,
                statusText: error.response?.statusText,
            });

            // Provide more helpful error message
            if (error.response?.data?.error === 'invalid_client') {
                throw new Error('Invalid Zoom API credentials. Please verify ZOOM_API_KEY (Client ID) and ZOOM_API_SECRET (Client Secret) in your .env file.');
            }

            throw new Error(`Failed to authenticate with Zoom API: ${errorMessage}`);
        }
    }

    /**
     * Create a Zoom meeting via API (requires Zoom API credentials)
     */
    private async createZoomMeetingViaAPI(bookingId: string, date: Date, duration: number): Promise<string> {
        try {
            this.logger.log(`Attempting to create Zoom meeting for booking ${bookingId}`);

            const accessToken = await this.getAccessToken();

            // Format the meeting start time (ISO 8601 format)
            const startTime = date.toISOString().replace(/\.\d{3}Z$/, 'Z');

            // Create meeting request
            const meetingData = {
                topic: `Video Consultancy - Booking ${bookingId}`,
                type: 2, // Scheduled meeting
                start_time: startTime,
                duration: duration, // Duration in minutes
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: false,
                    waiting_room: false,
                    auto_recording: 'none',
                },
            };

            this.logger.debug(`Creating Zoom meeting with data: ${JSON.stringify(meetingData)}`);

            const response = await this.axiosInstance.post(
                '/users/me/meetings',
                meetingData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const joinUrl = response.data.join_url;
            const meetingId = response.data.id;

            if (!joinUrl) {
                throw new Error('Zoom API returned meeting but no join_url');
            }

            this.logger.log(`Zoom meeting created successfully for booking ${bookingId}. Meeting ID: ${meetingId}, Join URL: ${joinUrl}`);
            return joinUrl;
        } catch (error: any) {
            const errorDetails = error.response?.data || error.message;
            this.logger.error(`Failed to create Zoom meeting via API for booking ${bookingId}:`, {
                error: errorDetails,
                status: error.response?.status,
                statusText: error.response?.statusText,
            });

            // Don't fallback to fake meeting ID - throw error so caller knows it failed
            throw new Error(`Failed to create Zoom meeting: ${JSON.stringify(errorDetails)}`);
        }
    }

    /**
     * Generate a unique meeting ID based on booking ID
     */
    private generateMeetingId(bookingId: string): string {
        // Generate a 9-11 digit meeting ID (Zoom format)
        const hash = bookingId.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        return Math.abs(hash).toString().padStart(9, '0').substring(0, 11);
    }
}

