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
    const collection = await CreateScheme(this.db, 'user_tests', {
      test: { type: 'string', isRequired: true },
      email: { type: 'string', isRequired: true },
    });

    const userRepo = new BaseMongoRepository<{
      test: string;
      email: string;
      id: string;
      createdAt?: Date;
      updatedAt?: Date;
    }>(collection);

    const newUser = await userRepo.create({
      test: 'John Doe',
      email: 'john.doe@example.com',
    });

    return {
      message: 'Готово',
      newUser,
    };
  }
}
