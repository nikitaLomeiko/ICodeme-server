import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [AuthModule],
  controllers: [],
})
export class AppModule {}
