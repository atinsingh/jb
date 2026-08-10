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

  /**
   * The envelope From. Transactional providers (SES, Postmark, Resend) use an
   * API key as the SMTP username, so deriving From from SMTP_USER produces an
   * address they reject. SMTP_FROM is documented in .env.example; fall back to
   * SMTP_USER only for plain-mailbox setups like Gmail.
   */
  private fromAddress(): string {
    const configured = process.env.SMTP_FROM;
    if (configured) {
      return configured.includes('<') ? configured : `"Jobocate" <${configured}>`;
    }
    return `"Jobocate" <${process.env.SMTP_USER}>`;
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping password reset email.');
      this.logger.warn(`Password reset token for ${email}: ${resetToken}`);
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.fromAddress(),
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
      from: this.fromAddress(),
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

  async sendOrgInviteEmail(
    email: string,
    options: {
      orgName?: string;
      inviterName?: string;
      token: string;
      role?: string;
    },
  ): Promise<void> {
    const { orgName, inviterName, token, role } = options;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping org invite email.');
      this.logger.warn(`Org invite token for ${email}: ${token}`);
      return;
    }

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;
    const companyLabel = orgName && orgName.trim() ? orgName.trim() : 'a company on Jobocate';
    const inviterLabel = inviterName && inviterName.trim() ? inviterName.trim() : 'A teammate';
    const roleLabel = role ? role.replace(/_/g, ' ') : 'team member';

    const mailOptions = {
      from: this.fromAddress(),
      to: email,
      subject: `You've been invited to join ${companyLabel} on Jobocate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've been invited to join ${companyLabel}</h2>
          <p>${inviterLabel} has invited you to join <strong>${companyLabel}</strong> on Jobocate as a <strong>${roleLabel}</strong>.</p>
          <p>
            <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; word-break: break-all;">${inviteUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Org invite email sent to: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send org invite email to ${email}:`, error.message);
      throw error;
    }
  }

  async sendEmailChangeNotification(email: string, newEmail: string): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      this.logger.warn('Email service not configured. Skipping email change notification.');
      return;
    }

    const mailOptions = {
      from: this.fromAddress(),
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

  /**
   * Notify the sales/support inbox about an inbound marketing lead.
   *
   * Returns true only if a message was actually handed to the transport, so
   * the caller can record delivery honestly. Throws on send failure; the lead
   * is already persisted by that point, so the throw is a signal, never data
   * loss.
   */
  async sendLeadNotification(lead: {
    kind: 'demo' | 'contact';
    name: string;
    email: string;
    company?: string;
    companySize?: string;
    role?: string;
    hiringVolume?: string;
    subject?: string;
    message?: string;
  }): Promise<boolean> {
    const inbox = process.env.LEADS_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !inbox) {
      // Log the full lead so it is recoverable from logs even with no SMTP.
      this.logger.warn(
        `Email not configured — ${lead.kind} lead not emailed: ${JSON.stringify(lead)}`,
      );
      return false;
    }

    const rows = [
      ['Name', lead.name],
      ['Email', lead.email],
      ['Company', lead.company],
      ['Company size', lead.companySize],
      ['Role', lead.role],
      ['Hiring volume', lead.hiringVolume],
      ['Subject', lead.subject],
    ]
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 14px 6px 0;color:#666;">${k}</td><td style="padding:6px 0;"><strong>${v}</strong></td></tr>`,
      )
      .join('');

    const heading = lead.kind === 'demo' ? 'New demo request' : 'New contact message';

    const mailOptions = {
      from: this.fromAddress(),
      to: inbox,
      replyTo: lead.email,
      subject: `${heading} — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
          <h2 style="color:#1B1A16;">${heading}</h2>
          <table style="border-collapse:collapse;font-size:14px;">${rows}</table>
          ${
            lead.message
              ? `<p style="margin-top:20px;color:#666;">Message</p>
                 <blockquote style="margin:0;padding:12px 16px;background:#f6f5f1;border-left:3px solid #1fa46a;white-space:pre-wrap;">${lead.message}</blockquote>`
              : ''
          }
          <p style="color:#999;font-size:12px;margin-top:28px;">Reply directly to this email to reach ${lead.name}.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    this.logger.log(`✅ ${heading} notification sent for ${lead.email}`);
    return true;
  }
}

