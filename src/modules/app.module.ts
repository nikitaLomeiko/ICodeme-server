import { DatabaseModule } from '@core/db/Database.module';
import { TestController } from '@modules/test.controller';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule],
  controllers: [TestController],
  providers: [],
})
export class AppModule {}
