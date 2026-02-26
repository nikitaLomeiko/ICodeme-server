import { Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/DataBase/Database.module';
import { FileService } from '@services/FileService/File.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [FileService],
})
export class AppModule {}
