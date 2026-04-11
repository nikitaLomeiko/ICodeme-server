import { Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { BaseMongoRepository } from '@core/db';

import { JwtHelper } from './helpers/Jwt.helper';
import { generateId } from '@core/helpers/GenerateId';
import { generateConfirmCode } from './helpers/Generate.confirm.code';
import { IServiceResponse } from '@core/types/Response.type';

import { IUser, UserKey } from '@models/user';
import {
  IConfirmationCode,
  ConfirmationCodeKey,
} from '@models/confirmation-code';
import {
  AuthError,
  IAuthResponse,
  IRefreshToken,
  IUserIdResponse,
  RefreshTokenKey,
} from '@models/auth';

import { EmailService } from '@services/emailService';

import config from '@core/config/jwt/jwt.config';
import e from 'express';

@Injectable()
export class AuthService {
  private repositoryUser: BaseMongoRepository<IUser>;
  private repositoryConfirmationCode: BaseMongoRepository<IConfirmationCode>;
  private repositoryRefreshToken: BaseMongoRepository<IRefreshToken>;
  private jwtHelper: JwtHelper;

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
      existingUser.password_hash,
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
        token: accessToken,
        refreshToken: refreshToken.token,
      },
    };
  }

  async register(
    userData: Omit<IUser, 'password_hash'>,
    password: string,
  ): Promise<IServiceResponse<IUserIdResponse, AuthError>> {
    const existingUser = await this.repositoryUser.findOne({
      email: userData.email,
    });

    if (existingUser) {
      return { success: false, error: AuthError.USER_EXISTS };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const newUser: IUser = {
      ...userData,
      password_hash: hashedPassword,
      createdAt: now,
      updatedAt: now,
      _id: generateId(userData.email),
      isEmailConfirmed: false,
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
  ): Promise<IServiceResponse<null, AuthError>> {
    const user = await this.repositoryUser.findOne({ _id: userId });

    if (!user) {
      return {
        success: false,
        error: AuthError.USER_NOT_FOUND,
      };
    }

    if (user.isEmailConfirmed) {
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
      { ...user, isEmailConfirmed: true },
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
  ): Promise<IServiceResponse<IAuthResponse, AuthError>> {
    const existingToken = await this.repositoryRefreshToken.findOne({
      token,
    });

    if (!existingToken || existingToken.expiresAt < new Date()) {
      return { success: false, error: AuthError.INVALID_TOKEN };
    }

    const user = await this.repositoryUser.findOne({
      _id: existingToken.userId,
    });

    if (!user) {
      return { success: false, error: AuthError.USER_NOT_FOUND };
    }

    const accessToken: string = this.jwtHelper.generateAccessToken(user);

    await this.repositoryRefreshToken.delete({ token });

    const newRefreshToken: IRefreshToken = this.jwtHelper.generateRefreshToken(
      user,
      config().ttl,
    );

    this.repositoryRefreshToken.create(newRefreshToken);

    return {
      success: true,
      data: {
        token: accessToken,
        refreshToken: newRefreshToken.token,
      },
    };
  }

  async generateAndSendConfirmCode(
    email: string,
  ): Promise<IServiceResponse<null, AuthError>> {
    const user = await this.repositoryUser.findOne({ email });

    if (!user) {
      return {
        success: false,
        error: AuthError.INVALID_CREDENTIALS,
      };
    }

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
      success: true,
    };
  }
}
