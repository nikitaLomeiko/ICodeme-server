import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy, AuthService } from '@services/authService';
import config from '@core/config/jwt/jwt.config';
import { DataBaseProvider } from '@core/db';

import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: config().secret,
      signOptions: { expiresIn: config().expiresIn },
    }),
  ],
  providers: [DataBaseProvider, JwtStrategy, AuthService],
  controllers: [AuthController],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
