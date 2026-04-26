import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import { BaseMongoRepository } from '@core/db';

import { JwtHelper } from './helpers/Jwt.helper';
import { TokenHelper } from './helpers/Token.helper';
import { generateId } from '@core/helpers/GenerateId';
import { IServiceResponse } from '@core/types/Response.type';

import { IUser, UserKey } from '@models/user';
import {
  IRefreshToken,
  ITokenResponse,
  IUserIdResponse,
  RefreshTokenKey,
} from '@models/auth';

import config from '@core/config/jwt/jwt.config';
import telegramConfig from '@core/config/telegram/telegram.config';
import { AuthError } from './types';
import { ITelegramAuthData } from './Auth.service';

@Injectable()
export class OauthService {
  private repositoryUser: BaseMongoRepository<IUser>;
  private repositoryRefreshToken: BaseMongoRepository<IRefreshToken>;
  private jwtHelper: JwtHelper;
  private tokenHelper: TokenHelper;

  constructor(
    db: Db,
    private jwtService: JwtService,
  ) {
    const collectionUser = db.collection(UserKey);
    const collectionRefreshToken = db.collection(RefreshTokenKey);

    this.repositoryUser = new BaseMongoRepository<IUser>(collectionUser);
    this.repositoryRefreshToken = new BaseMongoRepository<IRefreshToken>(
      collectionRefreshToken,
    );

    this.jwtHelper = new JwtHelper(this.jwtService);
    this.tokenHelper = new TokenHelper(
      this.jwtService,
      this.repositoryRefreshToken,
      this.repositoryUser,
      this.jwtHelper,
    );
  }

  async validateOrCreateGoogleUser(
    googleId: string,
    email: string,
    name: string,
    picture?: string,
  ): Promise<IServiceResponse<ITokenResponse & IUserIdResponse, AuthError>> {
    let user = await this.repositoryUser.findOne({ email });

    if (!user) {
      const now = new Date();
      const newUser: IUser = {
        _id: generateId(email),
        email,
        name,
        provider: 'google',
        googleId,
        picture,
        isEmailConfirmed: true,
        isResetPassword: false,
        createdAt: now,
        updatedAt: now,
      };

      const createdUserId = await this.repositoryUser.create(newUser);

      if (!createdUserId) {
        return {
          success: false,
          error: AuthError.USER_NOT_CREATED,
        };
      }

      user = { ...newUser, _id: createdUserId };
    } else if (user.provider !== 'google') {
      return {
        success: false,
        error: AuthError.USER_EXISTS,
      };
    }

    return this.tokenHelper.issueTokens(user);
  }

  async validateOrCreateGitHubUser(
    githubId: string,
    email: string,
    name: string,
    picture?: string,
    username?: string,
  ): Promise<IServiceResponse<ITokenResponse & IUserIdResponse, AuthError>> {
    let user = await this.repositoryUser.findOne({ email });

    if (!user) {
      const now = new Date();
      const newUser: IUser = {
        _id: generateId(email),
        email,
        name,
        provider: 'github',
        githubId,
        picture,
        username,
        isEmailConfirmed: true,
        isResetPassword: false,
        createdAt: now,
        updatedAt: now,
      };

      const createdUserId = await this.repositoryUser.create(newUser);

      if (!createdUserId) {
        return {
          success: false,
          error: AuthError.USER_NOT_CREATED,
        };
      }

      user = { ...newUser, _id: createdUserId };
    } else if (user.provider !== 'github') {
      return {
        success: false,
        error: AuthError.USER_EXISTS,
      };
    }

    return this.tokenHelper.issueTokens(user);
  }

  async validateOrCreateTelegramUser(
    telegramId: string,
    firstName: string,
    lastName?: string,
    username?: string,
    photoUrl?: string,
  ): Promise<IServiceResponse<ITokenResponse & IUserIdResponse, AuthError>> {
    const email = username
      ? `${username}@telegram.com`
      : `${telegramId}@telegram.com`;
    let user = await this.repositoryUser.findOne({ telegramId });

    if (!user) {
      const now = new Date();
      const name = `${firstName} ${lastName || ''}`.trim();
      const newUser: IUser = {
        _id: generateId(telegramId),
        email,
        name: name || `Telegram User ${telegramId}`,
        provider: 'telegram',
        telegramId,
        picture: photoUrl,
        username,
        isEmailConfirmed: true,
        isResetPassword: false,
        createdAt: now,
        updatedAt: now,
      };

      const createdUserId = await this.repositoryUser.create(newUser);

      if (!createdUserId) {
        return {
          success: false,
          error: AuthError.USER_NOT_CREATED,
        };
      }

      user = { ...newUser, _id: createdUserId };
    } else if (user.provider !== 'telegram') {
      return {
        success: false,
        error: AuthError.USER_EXISTS,
      };
    }

    return this.tokenHelper.issueTokens(user);
  }

  verifyTelegramAuthData(data: ITelegramAuthData): boolean {
    try {
      const botToken = telegramConfig().botToken;

      if (!botToken) {
        return false;
      }

      const { hash, auth_date, ...withoutHash } = data;

      const dataCheckString = Object.keys(withoutHash)
        .sort()
        .map((key) => `${key}=${withoutHash[key as keyof typeof withoutHash]}`)
        .join('\n');

      const secretKey = crypto.createHash('sha256').update(botToken).digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        console.error('Telegram: hash mismatch!');
        return false;
      }

      const authDate = new Date(parseInt(auth_date, 10) * 1000);
      const now = new Date();
      const diffInSeconds = (now.getTime() - authDate.getTime()) / 1000;

      if (diffInSeconds > 86400) {
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }
  }
}
