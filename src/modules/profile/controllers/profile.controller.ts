import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IProfile, IProfileData } from '@models/profile/Profile.model';
import { ProfileService } from '@services/profileService';
import { IResponse } from '@core/types/Response.type';

@Controller('profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  async getMyProfile(@Request() req): Promise<IResponse<IProfile>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    if (!result.success) {
      throw new NotFoundException(result.message);
    }

    return result;
  }

  @Post('me')
  async createNewProfile(
    @Request() req,
    @Body() data: { profile: IProfileData; programmingLanguage: string },
  ): Promise<IResponse<IProfile>> {
    const result = await this.profileService.CreateNewProfile(
      req.user,
      data.profile,
      data.programmingLanguage,
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return result;
  }

  @Put('me')
  async updateMyProfile(
    @Request() req,
    @Body() data: { profileData: IProfileData },
  ): Promise<IResponse<IProfile>> {
    const result = await this.profileService.ChangeProfileDataById(
      data.profileData,
      req.user.userId,
    );

    if (!result.success) {
      throw new NotFoundException(result.message);
    }

    return result;
  }

  @Delete('me')
  async deleteMyProfile(@Request() req): Promise<IResponse> {
    const result = await this.profileService.RemoveProfileById(req.user.userId);

    if (!result.success) {
      throw new NotFoundException(result.message);
    }

    return result;
  }
}
