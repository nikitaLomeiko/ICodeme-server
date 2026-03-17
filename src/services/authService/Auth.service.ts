import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Db } from 'mongodb';
import * as bcrypt from 'bcrypt';
import config from '@core/config/jwt/jwt.config';

import { JwtHelper } from './helpers/Jwt.helper';
import {
  IRefreshToken,
  RefreshTokenKey,
} from '@models/auth/RefreshToken.model';
import { IUser, UserKey } from '@models/user/User.model';
import { BaseMongoRepository } from '@core/db';
import { generateId } from '@core/helpers/GenerateId';
import { JwtService } from '@nestjs/jwt';
import {
  IAuthResponse,
  IAuthWithUserIdResponse,
} from '@models/auth/AuthResponse.model';
import { IResponse } from '@core/types/Response.type';

@Injectable()
export class AuthService {
  private repositoryUser: BaseMongoRepository<IUser>;
  private repositoryRefreshToken: BaseMongoRepository<IRefreshToken>;
  private jwtHelper: JwtHelper;

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
  }

  async login(
    email: string,
    password: string,
  ): Promise<IResponse<IAuthResponse>> {
    const existingUser = await this.repositoryUser.findOne({
      email: email,
    });

    if (!existingUser) {
      return { success: false, message: 'Invalid credentials' };
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password_hash,
    );

    if (!isPasswordValid) {
      return { success: false, message: 'Invalid credentials' };
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
  ): Promise<IResponse<IAuthWithUserIdResponse>> {
    const existingUser = await this.repositoryUser.findOne({
      email: userData.email,
    });

    if (existingUser) {
      return { success: false, message: 'User with this email already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const newUser: IUser = {
      ...userData,
      password_hash: hashedPassword,
      createdAt: now,
      updatedAt: now,
      _id: generateId(userData.email),
    };

    const resultId = await this.repositoryUser.create(newUser);

    const accessToken: string = this.jwtHelper.generateAccessToken(newUser);

    const refreshToken: IRefreshToken = this.jwtHelper.generateRefreshToken(
      newUser,
      config().ttl,
    );

    this.repositoryRefreshToken.create(refreshToken);

    return {
      success: true,
      data: {
        token: accessToken,
        refreshToken: refreshToken.token,
        userId: resultId,
      },
    };
  }

  async refreshToken(token: string): Promise<IResponse<IAuthResponse>> {
    const existingToken = await this.repositoryRefreshToken.findOne({
      token,
    });

    if (!existingToken || existingToken.expiresAt < new Date()) {
      return { success: false, message: 'Invalid refresh token' };
    }

    const user = await this.repositoryUser.findOne({
      _id: existingToken.userId,
    });

    if (!user) {
      return { success: false, message: 'User not found' };
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
}
