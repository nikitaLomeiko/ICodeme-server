import { Module, Global } from '@nestjs/common';
import { DBConnector } from '@modules/database/mongo/DBConnector';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
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
    },
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}
