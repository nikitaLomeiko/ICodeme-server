// test.controller.ts
import { Controller, Get, Inject } from '@nestjs/common';
import { Db } from 'mongodb';
import { CreateScheme } from '@core/db/mongo/CreateScheme';
import { BaseMongoRepository } from '@core/db/mongo/BaseMongoRepository';

@Controller('test')
export class TestController {
  constructor(@Inject('DATABASE_CONNECTION') private readonly db: Db) {}

  @Get()
  async testEndpoint() {
    const collection = await CreateScheme(this.db, 'users', {
      name: { bsonType: 'string', description: 'Имя пользователя' },
      email: { bsonType: 'string', description: 'Email пользователя' },
    }, ['name', 'email']);

    const userRepo = new BaseMongoRepository<{ name: string; email: string, id: string; createdAt?: Date; updatedAt?: Date }>(collection);

    // Используем репозиторий
    const newUser = await userRepo.create({ 
      name: 'John Doe', 
      email: 'john.doe@example.com' 
    });

    return {
      message: 'Готово',
      newUser,
    };
  }
}