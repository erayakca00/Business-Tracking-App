import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') || 'onboarding@resend.dev';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized successfully.');
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured. Email service will run in MOCK mode (logging to console).',
      );
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(
        `\n==================================================\n` +
          `MOCK EMAIL SENT\n` +
          `To: ${to}\n` +
          `Subject: ${subject}\n` +
          `Body:\n${html}\n` +
          `==================================================\n`,
      );
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (response.error) {
        this.logger.error(
          `Failed to send email to ${to} via Resend: ${JSON.stringify(response.error)}`,
        );
      } else {
        this.logger.log(
          `Email successfully sent to ${to}. ID: ${response.data?.id}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Verify your email address';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to Business Tracking App!</h2>
                <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Verify Email</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; color: #4b5563;"><a href="${url}">${url}</a></p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">This link will expire soon. If you did not register for an account, you can safely ignore this email.</p>
            </div>
        `;
    await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Reset your password';
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #ef4444; margin-bottom: 20px;">Reset Your Password</h2>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${url}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Reset Password</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; color: #4b5563;"><a href="${url}">${url}</a></p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">This link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
            </div>
        `;
    await this.sendEmail(email, subject, html);
  }

  async sendGroupInvitationEmail(
    email: string,
    groupName: string,
    inviterName: string,
    token: string,
  ): Promise<void> {
    const url = `${this.frontendUrl}/invite?token=${token}`;
    const subject = `You've been invited to join ${groupName}`;
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #8b5cf6; margin-bottom: 20px;">Group Invitation</h2>
                <p><strong>${inviterName}</strong> has invited you to join the group task board <strong>${groupName}</strong>.</p>
                <p>Click the button below to view the invitation and join the group:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${url}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">Accept Invitation</a>
                </div>
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p style="word-break: break-all; color: #4b5563;"><a href="${url}">${url}</a></p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">This invitation token is valid for 7 days.</p>
            </div>
        `;
    await this.sendEmail(email, subject, html);
  }
}
