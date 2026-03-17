import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { GeneralModule } from '@modules/general';

import { ProfileService } from '@services/profileService';

import { ProfileController } from './controllers/profile.controller';

dotenv.config();

@Module({
  imports: [GeneralModule],
  providers: [ProfileService],
  controllers: [ProfileController],
})
export class ProfileModule {}
