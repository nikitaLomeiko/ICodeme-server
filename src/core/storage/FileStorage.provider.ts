import { Provider } from '@nestjs/common';
import { BaseFileStorage } from './base';

export const FileStorageProvider: Provider = {
  provide: BaseFileStorage,
  useFactory: async () => {},
};
