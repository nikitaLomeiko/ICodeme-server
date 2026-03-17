import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { DataBaseProvider } from '@core/db';
import { JwtStrategy } from '@services/authService';

dotenv.config();

@Module({
  providers: [DataBaseProvider, JwtStrategy],
  exports: [DataBaseProvider, JwtStrategy],
})
export class GeneralModule {}
