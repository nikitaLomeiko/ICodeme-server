import { Provider } from '@nestjs/common';
import { DBConnector } from './mongo/DBConnector';
import { Db } from 'mongodb';

export const DataBaseProvider: Provider = {
  provide: Db,
  useFactory: async () => {
    const uri = process.env.DB_URL;
    const dbname = process.env.DB_NAME;

    if (!uri) {
      throw new Error('DB_URL is not defined in environment variables');
    }

    const connector = new DBConnector(uri);

    await connector.connect();
    console.log('Database connection established');

    return connector.client.db(dbname);
  },
};
