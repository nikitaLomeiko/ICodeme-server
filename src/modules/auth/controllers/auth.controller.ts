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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthError, AuthService } from '@services/authService';
import { IControllerResponse } from '@core/types/Response.type';
import { IAuthResponse, ITokenResponse, IUserIdResponse } from '@models/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('register')
  async register(
    @Request() req,
  ): Promise<IControllerResponse<IUserIdResponse>> {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const result = await this.authService.register(email, password);

    if (result.error === AuthError.USER_EXISTS) {
      throw new ConflictException('A user with such an email already exists');
    }

    if (result.error === AuthError.USER_NOT_CREATED) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const resultConfirmCode =
      await this.authService.generateAndSendConfirmCode(email);

    if (!resultConfirmCode.success) {
      throw new InternalServerErrorException(
        'An error occurred while generating the code',
      );
    }

    return {
      success: true,
      data: result.data,
      message: `The confirmation code has been sent to the mail ${email}`,
    };
  }

  @Post('confirm/code-email')
  async confirmCodeEmail(@Request() req): Promise<IControllerResponse> {
    const { code, userId } = req.body as { code: string; userId: string };

    const result = await this.authService.confirmCode(code, userId, {
      isEmailConfirmed: true,
    });

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

  @Post('confirm/code-reset-password')
  async confirmCodeResetPassword(@Request() req): Promise<IControllerResponse> {
    const { code, userId } = req.body as { code: string; userId: string };

    const result = await this.authService.confirmCode(code, userId, {
      isResetPassword: true,
    });

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

  @Post('send/confirm-code')
  async sendConfirmCodeForResetPassword(
    @Request() req,
  ): Promise<IControllerResponse<IUserIdResponse>> {
    const { email } = req.body as { email: string };

    const result = await this.authService.generateAndSendConfirmCode(email);

    if (result.error === AuthError.INVALID_CREDENTIALS) {
      throw new UnauthorizedException('Invalid email');
    }

    if (!result.success) {
      throw new InternalServerErrorException(
        'An error occurred while generating the code',
      );
    }

    return {
      ...result,
      message: `The confirmation code has been sent to the mail ${email}`,
    };
  }

  @Post('reset/password')
  async resetPassword(@Request() req): Promise<IControllerResponse> {
    const { newPassword, userId } = req.body as {
      newPassword: string;
      userId: string;
    };

    const result = await this.authService.resetPassword(userId, newPassword);

    if (result.error === AuthError.INVALID_CREDENTIALS) {
      throw new ForbiddenException(
        'Please confirm your email before reset password',
      );
    }

    if (!result.success) {
      throw new InternalServerErrorException(
        'An error occurred when trying to change the password',
      );
    }

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Post('refresh')
  async refresh(@Request() req): Promise<IControllerResponse<ITokenResponse>> {
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

  @Post('validate/tokens')
  async validateTokens(@Request() req): Promise<IControllerResponse<boolean>> {
    const { accessToken, refreshToken } = req.body as {
      accessToken: string;
      refreshToken: string;
    };

    console.log(accessToken);

    const result = await this.authService.validateTokens(
      accessToken,
      refreshToken,
    );

    return {
      success: result.success,
    };
  }

  @Get('verify-token')
  @UseGuards(AuthGuard('jwt'))
  async verifyToken(@Request() req) {
    return {
      success: true,
      data: req.user,
      message: 'Token is valid',
    };
  }
}
