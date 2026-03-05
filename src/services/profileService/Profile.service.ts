import { Injectable, NotFoundException } from '@nestjs/common';
import { Db } from 'mongodb';
import { BaseMongoRepository } from '@core/db';
import { generateId } from '@core/helpers/GenerateId';
import {
  IProfile,
  IProfileData,
  ProfileKey,
} from '@models/profile/Profile.model';

@Injectable()
export class ProfileService {
  private repositoryProfile: BaseMongoRepository<IProfile>;

  constructor(db: Db) {
    const collectionProfile = db.collection(ProfileKey);
    this.repositoryProfile = new BaseMongoRepository<IProfile>(
      collectionProfile,
    );
  }

  async getProfileById(id: string) {
    const profile = await this.repositoryProfile.find({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully',
    };
  }

  async CreateNewProfile(
    user: any,
    data: IProfileData,
    programmingLanguage: string,
  ) {
    const profile: IProfile = {
      _id: generateId(user.username),
      userId: user.id,
      data: data,
      levelPlanJSON: [],
      studyPlanJSON: [],
      stats: {
        experience: 0,
      },
      level: {
        experienceToNextLevel: 10,
        positionCount: 0,
        positionName: 'Начинающий',
      },
      study: {
        level: 1,
        module: 1,
        step: 1,
        programmingLanguage: programmingLanguage,
      },
    };

    const resultId = await this.repositoryProfile.create(profile);

    return {
      success: true,
      data: profile,
      profileId: resultId,
      message: 'Profile created successfully',
    };
  }

  async ChangeProfileDataById(data: IProfileData, id: string) {
    const profile = await this.repositoryProfile.find({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const result = await this.repositoryProfile.update(
      { _id: id },
      { ...profile, data },
    );

    if (!result) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      message: 'Profile updated successfully',
    };
  }

  async RemoveProfileById(id: string) {
    const result = await this.repositoryProfile.delete({ _id: id });

    if (!result) {
      throw new NotFoundException('Profile not found');
    }

    return {
      success: true,
      message: 'Profile deleted successfully',
    };
  }
}
