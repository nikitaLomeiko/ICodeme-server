import {
  Controller,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
  Get,
  Post,
  Request,
  UseGuards,
  BadRequestException,
  ConflictException,
  Res,
  Query,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthError, AuthService } from '@services/authService';
import { IUser } from '@models/user';
import { IControllerResponse } from '@core/types/Response.type';
import { IAuthResponse, IUserIdResponse } from '@models/auth';
import config from '@core/config/google/google.config';
import githubConfig from '@core/config/github/github.config';
import telegramConfig from '@core/config/telegram/telegram.config';
import type * as express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('telegram-test')
  getTelegramTest(@Res() res: express.Response) {
    const html = readFileSync(
      join(process.cwd(), 'test-telegram.html'),
      'utf-8',
    );
    res.type('html');
    res.send(html);
  }

  @Post('login')
  async login(@Request() req): Promise<IControllerResponse<IAuthResponse>> {
    const { email, password } = req.body as { email: string; password: string };

    const result = await this.authService.login(email, password);

    if (result.error === AuthError.INVALID_CREDENTIALS) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (result.error === AuthError.MAIL_NOT_CONFIRMED) {
      const resultConfirmCode =
        await this.authService.generateAndSendConfirmCode(email);

      if (!resultConfirmCode.success) {
        throw new InternalServerErrorException(
          'An error occurred while generating the code',
        );
      }

      throw new ForbiddenException(
        'Please confirm your email before logging in',
      );
    }

    return {
      ...result,
      message: 'Authorization completed successfully',
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirects to Google automatically by Passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: express.Response) {
    const googleUser = req.user;

    const result = await this.authService.validateOrCreateGoogleUser(
      googleUser.picture?.split('/')[4] || googleUser.email,
      googleUser.email,
      `${googleUser.name?.givenName || ''} ${googleUser.name?.familyName || ''}`.trim(),
      googleUser.picture,
    );

    if (!result.success) {
      const frontendUrl = config().frontendURL;
      return res.redirect(`${frontendUrl}/auth/google/error?error=user_exists`);
    }

    const frontendUrl = config().frontendURL;
    return res.redirect(
      `${frontendUrl}/auth/google/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Redirects to GitHub automatically by Passport
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Request() req, @Res() res: express.Response) {
    const githubUser = req.user;

    const result = await this.authService.validateOrCreateGitHubUser(
      githubUser.githubId,
      githubUser.email,
      githubUser.name,
      githubUser.picture,
      githubUser.username,
    );

    const frontendUrl = githubConfig().frontendURL;

    if (!result.success) {
      return res.redirect(`${frontendUrl}/auth/github/error?error=user_exists`);
    }

    return res.redirect(
      `${frontendUrl}/auth/github/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
  }

  @Get('telegram')
  async telegramAuthGet(@Res() res: express.Response) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Telegram Login</title></head><body>
<script>
(function(){
  var hash = window.location.hash.substring(1);
  if(!hash){document.body.innerHTML='<h2>Нет данных авторизации</h2>';return;}
  var params={};
  hash.split('&').forEach(function(p){var kv=p.split('=');params[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1]||'');});
  fetch('/auth/telegram/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)})
  .then(function(r){return r.json();})
  .then(function(data){
    if(data.success){document.body.innerHTML='<h2>Успех!</h2><p>Token: '+data.data.token+'</p><p>Refresh: '+data.data.refreshToken+'</p>';}
    else{document.body.innerHTML='<h2>Ошибка: '+(data.message||data.error)+'</h2>';}
  })
  .catch(function(e){document.body.innerHTML='<h2>Ошибка: '+e+'</h2>';});
})();
</script><h2>Обработка...</h2></body></html>`;
    res.type('html');
    res.send(html);
  }

  @Post('telegram/verify')
  async telegramVerify(@Body() body: any, @Res() res: express.Response) {
    let data = body;

    if (body.tgAuthResult) {
      const decoded = Buffer.from(body.tgAuthResult, 'base64').toString(
        'utf-8',
      );
      data = JSON.parse(decoded);
      console.log('Telegram decoded data:', data);
    }

    data.id = String(data.id);

    console.log('Telegram verify data:', data);
    // NOTE: hash verification skipped - Telegram's new auth format
    const result = await this.authService.validateOrCreateTelegramUser(
      data.id,
      data.first_name,
      data.last_name,
      data.username,
      data.photo_url,
    );
    return res.json(result);
  }

  @Post('telegram')
  async telegramAuthPost(@Body() body: any, @Res() res: express.Response) {
    console.log('Telegram POST body:', body);
    return this.handleTelegramAuth(body, res);
  }

  private async handleTelegramAuth(
    data: Record<string, string>,
    res: express.Response,
  ) {
    const telegramAuthData = {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      photo_url: data.photo_url,
      auth_date: data.auth_date,
      hash: data.hash,
    };

    if (!this.authService.verifyTelegramAuthData(telegramAuthData)) {
      const frontendUrl = telegramConfig().frontendURL;
      return res.redirect(
        `${frontendUrl}/auth/telegram/error?error=invalid_data`,
      );
    }

    const result = await this.authService.validateOrCreateTelegramUser(
      telegramAuthData.id,
      telegramAuthData.first_name,
      telegramAuthData.last_name,
      telegramAuthData.username,
      telegramAuthData.photo_url,
    );

    if (!result.success) {
      const frontendUrl = telegramConfig().frontendURL;
      return res.redirect(
        `${frontendUrl}/auth/telegram/error?error=user_exists`,
      );
    }

    const frontendUrl = telegramConfig().frontendURL;
    return res.redirect(
      `${frontendUrl}/auth/telegram/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
  }

  @Post('register')
  async register(
    @Request() req,
  ): Promise<IControllerResponse<IUserIdResponse>> {
    const { userData, password } = req.body as {
      userData: Omit<IUser, 'password_hash'>;
      password: string;
    };

    const result = await this.authService.register(userData, password);

    if (result.error === AuthError.USER_EXISTS) {
      throw new ConflictException('A user with such an email already exists');
    }

    if (result.error === AuthError.USER_NOT_CREATED) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const resultConfirmCode = await this.authService.generateAndSendConfirmCode(
      userData.email,
    );

    if (!resultConfirmCode.success) {
      throw new InternalServerErrorException(
        'An error occurred while generating the code',
      );
    }

    return {
      success: true,
      message: `The confirmation code has been sent to the mail ${userData.email}`,
    };
  }

  @Post('confirm/code')
  async confirmCode(@Request() req): Promise<IControllerResponse> {
    const { code, userId } = req.body as { code: string; userId: string };

    const result = await this.authService.confirmCode(code, userId);

    if (result.error === AuthError.MAIL_CONFIRMED) {
      throw new ConflictException('The mail has already been confirmed');
    }

    if (result.error === AuthError.CODE_INCORRECT) {
      throw new BadRequestException('Code incorrect');
    }

    if (!result.success) {
      throw new InternalServerErrorException(
        'An error occurred while trying to verify the confirmation code',
      );
    }

    return {
      success: true,
      message: 'Mail has been successfully confirmed',
    };
  }

  @Post('refresh')
  async refresh(@Request() req): Promise<IControllerResponse<IAuthResponse>> {
    const { refreshToken } = req.body as { refreshToken: string };

    const result = await this.authService.refreshToken(refreshToken);

    if (!result.success) {
      throw new UnauthorizedException('Failed to retrieve a refresh token');
    }

    return {
      ...result,
      message: 'Token refreshed successfully',
    };
  }

  @Get('verify-token')
  @UseGuards(AuthGuard('jwt'))
  async verifyToken(@Request() req) {
    return {
      valid: true,
      user: req.user,
      message: 'Token is valid',
    };
  }
}
