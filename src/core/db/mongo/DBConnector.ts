import { MongoClient } from 'mongodb';
import { IDBConnector } from '../types/DBConnector.type';

export class DBConnector implements IDBConnector<MongoClient> {
  client: MongoClient;

  constructor(
    private uri: string,
    private dbName: string = 'db',
  ) {
    this.client = new MongoClient(this.uri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log(`Connected to MongoDB: ${this.dbName}`);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error);
      throw error;
    }
  }
}
