import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth';
import { ProfileModule } from './profile';
import { StudyModule } from './study';
import { EmailModule } from '@modules/email';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    ProfileModule,
    StudyModule,
    EmailModule,
  ],
})
export class AppModule {}
