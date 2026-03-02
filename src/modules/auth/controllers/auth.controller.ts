import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from '@services/authService';
import { IUser } from '@models/user/User.model';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Request() req) {
    const { email, password } = req.body as { email: string; password: string };

    return this.authService.login(email, password);
  }

  @Post('register')
  async register(@Request() req) {
    const { userData, password } = req.body as {
      userData: Omit<IUser, 'password_hash'>;
      password: string;
    };

    return this.authService.register(userData, password);
  }

  @Post('refresh')
  async refresh(@Request() req) {
    const { refreshToken } = req.body as { refreshToken: string };

    return this.authService.refreshToken(refreshToken);
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
