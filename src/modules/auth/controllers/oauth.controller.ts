import {
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Res,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OauthService } from '@services/authService';
import config from '@core/config/google/google.config';
import githubConfig from '@core/config/github/github.config';
import telegramConfig from '@core/config/telegram/telegram.config';

import type * as express from 'express';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req, @Res() res: express.Response) {
    const googleUser = req.user;

    const result = await this.oauthService.validateOrCreateGoogleUser(
      googleUser.picture?.split('/')[4] || googleUser.email,
      googleUser.email,
      `${googleUser.name?.givenName || ''} ${googleUser.name?.familyName || ''}`.trim(),
      googleUser.picture,
    );

    const frontendUrl = config().frontendURL;

    if (!result.success) {
      return res.redirect(`${frontendUrl}/auth/error?error=user_exists`);
    }

    return res.redirect(
      `${frontendUrl}/auth/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Request() req, @Res() res: express.Response) {
    const githubUser = req.user;

    const result = await this.oauthService.validateOrCreateGitHubUser(
      githubUser.githubId,
      githubUser.email,
      githubUser.name,
      githubUser.picture,
      githubUser.username,
    );

    const frontendUrl = githubConfig().frontendURL;

    if (!result.success) {
      return res.redirect(`${frontendUrl}/auth/error?error=user_exists`);
    }

    return res.redirect(
      `${frontendUrl}/auth/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
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

    if (data.id) {
      data.id = String(data.id);
    }

    if (!data.id || !data.first_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: id or first_name',
      });
    }

    try {
      const result = await this.oauthService.validateOrCreateTelegramUser(
        data.id,
        data.first_name,
        data.last_name,
        data.username,
        data.photo_url,
      );
      return res.json(result);
    } catch (error) {
      console.error('Telegram verify error:', error);
      return res.status(500).json({
        success: false,
        message: error || 'Internal server error',
      });
    }
  }

  @Post('telegram')
  async telegramAuthPost(@Body() body: any, @Res() res: express.Response) {
    const telegramAuthData = {
      id: body.id,
      first_name: body.first_name,
      last_name: body.last_name,
      username: body.username,
      photo_url: body.photo_url,
      auth_date: body.auth_date,
      hash: body.hash,
    };

    if (!this.oauthService.verifyTelegramAuthData(telegramAuthData)) {
      const frontendUrl = telegramConfig().frontendURL;
      return res.redirect(`${frontendUrl}/auth/error?error=invalid_data`);
    }

    const result = await this.oauthService.validateOrCreateTelegramUser(
      telegramAuthData.id,
      telegramAuthData.first_name,
      telegramAuthData.last_name,
      telegramAuthData.username,
      telegramAuthData.photo_url,
    );

    if (!result.success) {
      const frontendUrl = telegramConfig().frontendURL;
      return res.redirect(`${frontendUrl}/auth/error?error=user_exists`);
    }

    const frontendUrl = telegramConfig().frontendURL;
    return res.redirect(
      `${frontendUrl}/auth/success?token=${result.data?.token}&refreshToken=${result.data?.refreshToken}`,
    );
  }
}
