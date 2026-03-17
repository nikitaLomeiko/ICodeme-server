import { Module } from '@nestjs/common';

import { AuthModule } from './auth';
import { ProfileModule } from './profile';
import { StudyModule } from './study';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [AuthModule, ProfileModule, StudyModule],
})
export class AppModule {}
