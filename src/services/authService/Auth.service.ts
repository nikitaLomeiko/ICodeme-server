import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { BaseMongoRepository } from '@core/db';

import { JwtHelper } from './helpers/Jwt.helper';
import { TokenHelper } from './helpers/Token.helper';
import { generateId } from '@core/helpers/GenerateId';
import { generateConfirmCode } from './helpers/Generate.confirm.code';
import { IServiceResponse } from '@core/types/Response.type';

import { IUser, UserKey } from '@models/user';
import {
  IConfirmationCode,
  ConfirmationCodeKey,
} from '@models/confirmation-code';
import {
  IAuthResponse,
  IRefreshToken,
  ITokenResponse,
  IUserIdResponse,
  RefreshTokenKey,
} from '@models/auth';

import { EmailService } from '@services/emailService';

import config from '@core/config/jwt/jwt.config';
import { AuthError } from './types';
import { error } from 'console';

export interface ITelegramAuthData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

@Injectable()
export class AuthService {
  private repositoryUser: BaseMongoRepository<IUser>;
  private repositoryConfirmationCode: BaseMongoRepository<IConfirmationCode>;
  private repositoryRefreshToken: BaseMongoRepository<IRefreshToken>;
  private jwtHelper: JwtHelper;
  private tokenHelper: TokenHelper;

  constructor(
    db: Db,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {
    const collectionUser = db.collection(UserKey);
    const collectionRefreshToken = db.collection(RefreshTokenKey);
    const collectionConfirmationCode = db.collection(ConfirmationCodeKey);

    this.repositoryUser = new BaseMongoRepository<IUser>(collectionUser);
    this.repositoryRefreshToken = new BaseMongoRepository<IRefreshToken>(
      collectionRefreshToken,
    );
    this.repositoryConfirmationCode =
      new BaseMongoRepository<IConfirmationCode>(collectionConfirmationCode);

    this.jwtHelper = new JwtHelper(this.jwtService);
    this.tokenHelper = new TokenHelper(
      this.jwtService,
      this.repositoryRefreshToken,
      this.repositoryUser,
      this.jwtHelper,
    );
    this.emailService = emailService;
  }

  async login(
    email: string,
    password: string,
  ): Promise<IServiceResponse<IAuthResponse, AuthError>> {
    const existingUser = await this.repositoryUser.findOne({
      email: email,
    });

    if (!existingUser) {
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password_hash || '',
    );

    if (!isPasswordValid) {
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }

    if (!existingUser.isEmailConfirmed) {
      return {
        success: false,
        error: AuthError.MAIL_NOT_CONFIRMED,
      };
    }

    this.repositoryRefreshToken.delete({ userId: existingUser._id });

    const accessToken: string =
      this.jwtHelper.generateAccessToken(existingUser);

    const refreshToken: IRefreshToken = this.jwtHelper.generateRefreshToken(
      existingUser,
      config().ttl,
    );

    this.repositoryRefreshToken.create(refreshToken);

    return {
      success: true,
      data: {
        email: existingUser.email,
        userId: existingUser._id,
        accessToken,
        refreshToken: refreshToken.token,
      },
    };
  }

  async register(
    email: string,
    password: string,
  ): Promise<IServiceResponse<IUserIdResponse, AuthError>> {
    const existingUser = await this.repositoryUser.findOne({
      email: email,
    });

    if (existingUser) {
      return { success: false, error: AuthError.USER_EXISTS };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const newUser: IUser = {
      name: `new user_${generateId(email)}`,
      email: email,
      password_hash: hashedPassword,
      createdAt: now,
      updatedAt: now,
      _id: generateId(email),
      isEmailConfirmed: false,
      isResetPassword: false,
    };

    const resultCreatedUser = await this.repositoryUser.create(newUser);

    if (!resultCreatedUser) {
      return {
        success: false,
        error: AuthError.USER_NOT_CREATED,
      };
    }

    return {
      success: true,
      data: { userId: resultCreatedUser },
    };
  }

  async confirmCode(
    code: string,
    userId: string,
    updateData: Partial<{ [key: string]: any }>,
  ): Promise<IServiceResponse<null, AuthError>> {
    const user = await this.repositoryUser.findOne({ _id: userId });

    if (!user) {
      return {
        success: false,
        error: AuthError.USER_NOT_FOUND,
      };
    }

    if ('isEmailConfirmed' in updateData && user.isEmailConfirmed) {
      return {
        success: false,
        error: AuthError.MAIL_CONFIRMED,
      };
    }

    const confirmCode = await this.repositoryConfirmationCode.findOne({
      userId,
    });

    if (!confirmCode) {
      return {
        success: false,
        error: AuthError.CONFIRMATION_CODE_NOT_CREATED,
      };
    }

    const isConfirmCodeValid = await bcrypt.compare(code, confirmCode.codeHash);

    if (!isConfirmCodeValid) {
      return {
        success: false,
        error: AuthError.CODE_INCORRECT,
      };
    }

    await this.repositoryConfirmationCode.delete({
      codeHash: confirmCode.codeHash,
    });

    const resultUpdatedUser = await this.repositoryUser.update(
      { _id: userId },
      { ...user, ...updateData },
    );

    if (!resultUpdatedUser) {
      return {
        success: false,
        error: AuthError.USER_NOT_UPDATED,
      };
    }

    return {
      success: true,
    };
  }

  async refreshToken(
    token: string,
  ): Promise<IServiceResponse<ITokenResponse, AuthError>> {
    return this.tokenHelper.refreshToken(token);
  }

  async resetPassword(
    userId: string,
    newPassword: string,
  ): Promise<IServiceResponse<null, AuthError>> {
    const user = await this.repositoryUser.findOne({ _id: userId });

    if (!user) {
      return { success: false, error: AuthError.USER_NOT_FOUND };
    }

    if (!user.isEmailConfirmed) {
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await this.repositoryUser.update(
      { _id: userId },
      { ...user, password_hash: hashedPassword, isResetPassword: false },
    );

    if (!result) {
      return { success: false, error: AuthError.USER_NOT_UPDATED };
    }

    return {
      success: true,
    };
  }

  async generateAndSendConfirmCode(
    email: string,
  ): Promise<IServiceResponse<IUserIdResponse, AuthError>> {
    const user = await this.repositoryUser.findOne({ email });

    if (!user) {
      return {
        success: false,
        error: AuthError.INVALID_CREDENTIALS,
      };
    }

    await this.repositoryConfirmationCode.delete({ userId: user._id });

    const now = new Date();
    const code = generateConfirmCode();

    const hashedConfirmCode = await bcrypt.hash(code, 10);

    const newCode: IConfirmationCode = {
      _id: generateId(email),
      userId: user._id,
      codeHash: hashedConfirmCode,
      createdAt: now,
      updatedAt: now,
    };

    const resultCreatedConfirmCode =
      await this.repositoryConfirmationCode.create(newCode);

    if (!resultCreatedConfirmCode) {
      return {
        success: false,
        error: AuthError.CONFIRMATION_CODE_NOT_CREATED,
      };
    }

    await this.emailService.sendEmail({
      subject: `Код подтверждения`,
      to: email,
      text: `${code}`,
    });

    return {
      data: { userId: user._id },
      success: true,
    };
  }

  async validateTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<IServiceResponse<boolean, AuthError>> {
    return this.tokenHelper.validateTokens(accessToken, refreshToken);
  }
}
