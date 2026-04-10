import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailOptions } from './types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {
    this.logger.log('EmailService инициализирован');
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    this.logger.log(
      `Подготовка письма: to=${options.to}, subject=${options.subject}`,
    );

    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`✅ Письмо отправлено на ${options.to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Ошибка отправки на ${options.to}: ${message}`);
      throw error;
    }
  }
}
