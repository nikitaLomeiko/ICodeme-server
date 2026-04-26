import { JwtService } from '@nestjs/jwt';

import { BaseMongoRepository } from '@core/db';
import { IServiceResponse } from '@core/types/Response.type';
import { IUser } from '@models/user';
import { IRefreshToken, ITokenResponse, IUserIdResponse } from '@models/auth';
import { JwtHelper } from './Jwt.helper';
import config from '@core/config/jwt/jwt.config';
import { AuthError } from '../types';

export class TokenHelper {
  constructor(
    private jwtService: JwtService,
    private repositoryRefreshToken: BaseMongoRepository<IRefreshToken>,
    private repositoryUser: BaseMongoRepository<IUser>,
    private jwtHelper: JwtHelper,
  ) {}

  async refreshToken(
    token: string,
  ): Promise<IServiceResponse<ITokenResponse, AuthError>> {
    const existingToken = await this.repositoryRefreshToken.findOne({ token });

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

    await this.repositoryRefreshToken.delete({ userId: user._id });

    const newRefreshToken: IRefreshToken = this.jwtHelper.generateRefreshToken(
      user,
      config().ttl,
    );

    this.repositoryRefreshToken.create(newRefreshToken);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken.token,
      },
    };
  }

  async validateTokens(
    accessToken: string,
    refreshToken: string,
  ): Promise<IServiceResponse<boolean, AuthError>> {
    if (!accessToken || !refreshToken)
      return { success: false, error: AuthError.INVALID_CREDENTIALS };

    let payload: any;
    try {
      payload = this.jwtService.verify(accessToken);
    } catch (e) {
      return { success: false, error: AuthError.INVALID_CREDENTIALS };
    }

    const existingRefresh = await this.repositoryRefreshToken.findOne({
      token: refreshToken,
    });

    if (!existingRefresh)
      return { success: false, error: AuthError.INVALID_CREDENTIALS };

    if (existingRefresh.expiresAt < new Date())
      return { success: false, error: AuthError.INVALID_CREDENTIALS };

    if (payload && payload.sub !== existingRefresh.userId)
      return { success: false, error: AuthError.INVALID_CREDENTIALS };

    return { success: true };
  }

  async issueTokens(
    user: IUser,
  ): Promise<IServiceResponse<ITokenResponse & IUserIdResponse, AuthError>> {
    const accessToken: string = this.jwtHelper.generateAccessToken(user);

    const newRefreshToken: IRefreshToken = this.jwtHelper.generateRefreshToken(
      user,
      config().ttl,
    );

    await this.repositoryRefreshToken.delete({ userId: user._id });
    await this.repositoryRefreshToken.create(newRefreshToken);

    return {
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken.token,
        userId: user._id,
      },
    };
  }
}
