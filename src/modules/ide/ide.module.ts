import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { GeneralModule } from '@modules/general';

import { DockerService } from '@services/dockerService';
import { IdeDockerController } from './controllers/ide-docker.controller';
import { IdeProjectController } from './controllers/ide-project.controller';
import { FileStorageProvider } from '@core/storage';

dotenv.config();

@Module({
  imports: [GeneralModule],
  providers: [DockerService, FileStorageProvider],
  controllers: [IdeDockerController, IdeProjectController],
})
export class IdeModule {}
