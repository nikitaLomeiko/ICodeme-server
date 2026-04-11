import {
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@services/authService';
import { IUser } from '@models/user/User.model';
import { AuthGuard } from '@nestjs/passport';
import { IControllerResponse } from '@core/types/Response.type';
import {
  IAuthResponse,
  IUserIdResponse,
} from '@models/auth/AuthResponse.model';
import { AuthError } from '@models/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Request() req): Promise<IControllerResponse<IAuthResponse>> {
    const { email, password } = req.body as { email: string; password: string };

    const result = await this.authService.login(email, password);

    switch (result.error) {
      case AuthError.INVALID_CREDENTIALS:
        return {
          success: false,
          message: 'Invalid username or password',
        };
      case AuthError.MAIL_NOT_CONFIRMED:
        return {
          success: false,
          message:
            'Mail not confirmed, the code has been sent to your email, please confirm',
        };
      case AuthError.CONFIRMATION_CODE_NOT_CREATED:
        return {
          success: false,
          message:
            'The email is not verified. Failed to create a verification code',
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

    switch (result.error) {
      case AuthError.USER_EXISTS:
        return {
          success: false,
          message: 'A user with such an email already exists',
        };
      case AuthError.USER_NOT_CREATED:
        return {
          success: false,
          message: 'Failed to create a user',
        };
      case AuthError.CONFIRMATION_CODE_NOT_CREATED:
        return {
          success: false,
          message:
            'The email is not verified. Failed to create a verification code',
        };
    }

    return {
      ...result,
      message:
        'A code was sent to your email, and you need to confirm your email',
    };
  }

  @Post('confirm/code')
  async confirmCode(@Request() req): Promise<IControllerResponse> {
    const { code, userId } = req.body as { code: string; userId: string };

    const result = await this.authService.confirmCode(code, userId);

    switch (result.error) {
      case AuthError.MAIL_CONFIRMED:
        return {
          success: false,
          message: 'The mail has already been confirmed',
        };
      case AuthError.USER_NOT_FOUND:
        return {
          success: false,
          message: 'User not found',
        };
      case AuthError.CONFIRMATION_CODE_NOT_CREATED:
        return {
          success: false,
          message:
            'The email is not verified. Failed to create a verification code',
        };
      case AuthError.CODE_INCORRECT:
        return {
          success: false,
          message: 'Code incorrect',
        };
      case AuthError.USER_NOT_UPDATED:
        return {
          success: false,
          message: 'User not updated',
        };
    }

    return result;
  }

  @Post('refresh')
  async refresh(@Request() req): Promise<IControllerResponse<IAuthResponse>> {
    const { refreshToken } = req.body as { refreshToken: string };

    const result = await this.authService.refreshToken(refreshToken);

    switch (result.error) {
      case AuthError.INVALID_TOKEN:
        return {
          success: false,
          message: 'Invalid token',
        };
      case AuthError.USER_NOT_FOUND:
        return {
          success: false,
          message: 'User not found',
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
