import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IProfile, IProfileData } from '@models/profile/Profile.model';

@Controller('profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfilesController {
  @Get('me')
  async getMyProfile(@Request() req) {}

  @Post('me')
  async createOrUpdateMyProfile(
    @Request() req,
    @Body() data: { profile: IProfileData; programmingLanguage: string },
  ) {}

  @Put('me')
  async updateMyProfile(
    @Request() req,
    @Body() profileData: Partial<IProfile>,
  ) {}

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyProfile(@Request() req) {}

  // Получить профиль по ID пользователя (публичный профиль)
  @Get('user/:userId')
  async getProfileByUserId(@Param('userId') userId: string) {}

  // Получить уровень пользователя
  @Get('me/level')
  async getMyLevel(@Request() req) {}

  // Добавить опыт пользователю
  @Post('me/level/experience')
  async addExperience(
    @Request() req,
    @Body() body: { amount: number; source: string },
  ) {}

  // Получить достижения пользователя
  @Get('me/achievements')
  async getMyAchievements(@Request() req) {}

  // Получить статистику пользователя
  @Get('me/stats')
  async getMyStats(@Request() req) {}

  // Обновить настройки профиля
  @Put('me/settings')
  async updateSettings(@Request() req) {}

  // Загрузить аватар
  @Post('me/avatar')
  async uploadAvatar(@Request() req, @Body() body: { avatarUrl: string }) {}

  // Поиск профилей
  @Get('search')
  async searchProfiles(
    @Query('query') searchQuery: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {}

  // Получить топ пользователей по уровню/опыту
  @Get('leaderboard')
  async getLeaderboard(
    @Query('period') period: 'daily' | 'weekly' | 'all' = 'all',
    @Query('limit') limit: number = 10,
  ) {}

  // Добавить достижение пользователю (возможно, только для админов)
  @Post(':userId/achievements')
  @UseGuards(AuthGuard('jwt'))
  async addAchievementToUser(
    @Param('userId') userId: string,
    @Body() body: { achievementId: string },
  ) {}

  // Обновить прогресс обучения
  @Post('me/study/progress')
  async updateStudyProgress(
    @Request() req,
    @Body()
    progress: {
      module: number;
      level: number;
      step: number;
      completed?: boolean;
    },
  ) {}
}
