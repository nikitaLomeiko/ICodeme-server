import {
  ConflictException,
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
import { IResponse } from '@core/types/Response.type';
import {
  IAuthResponse,
  IAuthWithUserIdResponse,
} from '@models/auth/AuthResponse.model';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Request() req): Promise<IResponse<IAuthResponse>> {
    const { email, password } = req.body as { email: string; password: string };

    const result = await this.authService.login(email, password);

    if (!result.success) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return result;
  }

  @Post('register')
  async register(@Request() req): Promise<IResponse<IAuthWithUserIdResponse>> {
    const { userData, password } = req.body as {
      userData: Omit<IUser, 'password_hash'>;
      password: string;
    };

    const result = await this.authService.register(userData, password);

    if (!result.success) {
      throw new ConflictException(result.message);
    }

    return result;
  }

  @Post('refresh')
  async refresh(@Request() req): Promise<IResponse<IAuthResponse>> {
    const { refreshToken } = req.body as { refreshToken: string };

    const result = await this.authService.refreshToken(refreshToken);

    if (!result.success) {
      throw new UnauthorizedException(result.message);
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
