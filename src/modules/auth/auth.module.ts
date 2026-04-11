import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { GeneralModule } from '@modules/general';
import { EmailModule } from '@modules/email';

import { AuthController } from './controllers/auth.controller';
import {
  AuthService,
  GoogleStrategy,
  GitHubStrategy,
} from '@services/authService';
import config from '@core/config/jwt/jwt.config';

import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: config().secret,
      signOptions: { expiresIn: config().expiresIn },
    }),
    GeneralModule,
    EmailModule,
  ],
  providers: [AuthService, GoogleStrategy, GitHubStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
