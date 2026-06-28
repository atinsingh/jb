import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify connection configuration
    if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      this.transporter.verify((error) => {
        if (error) {
          this.logger.warn('⚠️ Email service configuration error:', error.message);
          this.logger.warn('   Email sending will be disabled. Set SMTP_USER and SMTP_PASSWORD to enable.');
        } else {
          this.logger.log('✅ Email service configured successfully');
        }
      });
    } else {
      this.logger.warn('⚠️ Email service not configured. Set SMTP_USER and SMTP_PASSWORD to enable.');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping password reset email.');
      this.logger.warn(`Password reset token for ${email}: ${resetToken}`);
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Jobocate" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p>
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Password reset email sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send password reset email to ${email}:`, error.message);
      throw error;
    }
  }

  async sendEmailVerificationEmail(email: string, verificationToken: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping verification email.');
      this.logger.warn(`Verification token for ${email}: ${verificationToken}`);
      return;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"Jobocate" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <p>
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Verification email sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send verification email to ${email}:`, error.message);
      throw error;
    }
  }

  async sendEmailChangeNotification(email: string, newEmail: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping email change notification.');
      return;
    }

    const mailOptions = {
      from: `"Jobocate" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Email Address Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Address Changed</h2>
          <p>Your email address has been changed to: <strong>${newEmail}</strong></p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't make this change, please contact support immediately.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email change notification sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email change notification to ${email}:`, error.message);
      // Don't throw error for notification emails
    }
  }
}

