import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@services/authService';
import { IUser } from '@models/user';
import { IControllerResponse } from '@core/types/Response.type';
import { IAuthResponse, IUserIdResponse } from '@models/auth';
import { AuthError } from '@models/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Request() req): Promise<IControllerResponse<IAuthResponse>> {
    const { email, password } = req.body as { email: string; password: string };

    const result = await this.authService.login(email, password);

    if (result.error === AuthError.INVALID_CREDENTIALS) {
      return {
        success: false,
        message: 'Invalid username or password',
      };
    }

    if (result.error === AuthError.MAIL_NOT_CONFIRMED) {
      const resultConfirmCode =
        await this.authService.generateAndSendConfirmCode(email);

      if (!resultConfirmCode.success) {
        return {
          success: false,
          message: 'an error occurred while generating the code',
        };
      }

      return {
        success: true,
        message: `The confirmation code has been sent to the mail ${email}`,
      };
    }

    return result;
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
      return {
        success: false,
        message: 'A user with such an email already exists',
      };
    }

    if (result.error === AuthError.USER_NOT_CREATED) {
      return {
        success: false,
        message: 'Failed to create a user',
      };
    }

    const resultConfirmCode = await this.authService.generateAndSendConfirmCode(
      userData.email,
    );

    if (!resultConfirmCode.success) {
      return {
        success: false,
        message: 'an error occurred while generating the code',
      };
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
      return {
        success: false,
        message: 'The mail has already been confirmed',
      };
    }

    if (result.error === AuthError.CODE_INCORRECT) {
      return {
        success: false,
        message: 'Code incorrect',
      };
    }

    if (!result.success) {
      return {
        success: false,
        message:
          'An error occurred while trying to verify the confirmation code',
      };
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
      return {
        success: false,
        message: 'Failed to retrieve a refresh token',
      };
    }

    return result;
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
