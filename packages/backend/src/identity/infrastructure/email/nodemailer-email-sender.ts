import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { EmailSenderPort } from '../../domain/ports/email-sender.port';

@Injectable()
export class NodemailerEmailSender implements EmailSenderPort {
  private readonly logger = new Logger(NodemailerEmailSender.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_SMTP_HOST', '');
    const port = this.configService.get<number>('EMAIL_SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('EMAIL_SMTP_SECURE', false);
    const user = this.configService.get<string>('EMAIL_SMTP_USER', '');
    const pass = this.configService.get<string>('EMAIL_SMTP_PASS', '');
    
    this.fromAddress = this.configService.get<string>('EMAIL_FROM', 'noreply@ticketbox.vn');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
  }

  async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: toEmail,
        subject: 'Đặt lại mật khẩu TicketBox',
        text: `Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn: ${resetLink}\n\nLiên kết này sẽ hết hạn sau 1 giờ.`,
        html: `<p>Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn: <a href="${resetLink}">${resetLink}</a></p><p>Liên kết này sẽ hết hạn sau 1 giờ.</p>`,
      });
      this.logger.log(`Password reset email sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${toEmail}`, error);
    }
  }
}
