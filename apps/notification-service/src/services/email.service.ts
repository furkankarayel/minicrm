import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { StructuredLogger } from '@app/common/logging';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new StructuredLogger('EmailService');
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initializes the email transporter based on configuration
   * Supports both SMTP and development ethereal email
   */
  private initializeTransporter(): void {
    const emailProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');
    
    if (emailProvider === 'gmail') {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASSWORD'),
        },
      });
    } else {
      // For development/testing, use ethereal email
      this.logger.warn('Using ethereal email for development');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test',
        },
      });
    }

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter verification failed', error.stack, {
          error: error.message,
        });
      } else {
        this.logger.log('Email transporter is ready');
      }
    });
  }

  /**
   * Sends a welcome email to newly created users
   * This is the main email functionality for the notification service
   */
  async sendWelcomeEmail(to: string, firstName: string, role: string): Promise<void> {
    this.logger.log('Sending welcome email', {
      to,
      firstName,
      role,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to MiniCRM!</h1>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #007bff; margin-top: 0;">Hello ${firstName}!</h2>
          <p style="color: #666; line-height: 1.6">
            Your account has been successfully created with the role: <strong>${role}</strong>
          </p>
          <p style="color: #666; line-height: 1.6">
            You can now log in to your MiniCRM account and start managing your leads and customers.
          </p>
        </div>
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message from MiniCRM. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: 'Welcome to MiniCRM!',
      html,
    });
  }

  /**
   * Core email sending method
   * Handles the actual email transmission
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.configService.get('EMAIL_FROM_NAME', 'MiniCRM Support')}" <${this.configService.get('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log('Email sent successfully', {
        to: options.to,
        messageId: info.messageId,
        response: info.response,
      });

      // If using ethereal email, log the preview URL
      if (info.messageId && info.previewURL) {
        this.logger.log('Email preview available', {
          previewURL: info.previewURL,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send email', error.stack, {
        to: options.to,
        error: error.message,
      });
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Converts HTML content to plain text for email fallback
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }
} 