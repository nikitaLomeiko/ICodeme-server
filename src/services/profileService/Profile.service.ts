import { Injectable, NotFoundException } from '@nestjs/common';
import { Db } from 'mongodb';
import { BaseMongoRepository } from '@core/db';
import { generateId } from '@core/helpers/GenerateId';
import {
  IModule,
  IProfile,
  IProfileData,
  ProfileKey,
} from '@models/profile/Profile.model';
import { IServiceResponse } from '@core/types/Response.type';
import { ProfileError } from './types/Error.types';

@Injectable()
export class ProfileService {
  private repositoryProfile: BaseMongoRepository<IProfile>;

  constructor(db: Db) {
    const collectionProfile = db.collection(ProfileKey);
    this.repositoryProfile = new BaseMongoRepository<IProfile>(
      collectionProfile,
    );
  }

  async getProfileById(
    id: string,
  ): Promise<IServiceResponse<IProfile, ProfileError>> {
    const profile = await this.repositoryProfile.findOne({ userId: id });

    if (!profile) {
      return { success: false, error: ProfileError.PROFILE_NOT_FOUND };
    }

    return { success: true, data: profile };
  }

  async CreateNewProfile(
    user: { username: string; userId: string },
    data: IProfileData,
    programmingLanguage: string,
  ): Promise<IServiceResponse<IProfile, ProfileError>> {
    const profile = await this.repositoryProfile.findOne({
      userId: user.userId,
    });

    if (profile) {
      return {
        success: false,
        error: ProfileError.PROFILE_ALREADY_CREATED,
      };
    }

    const newProfile: IProfile = {
      _id: generateId(user.userId),
      userId: user.userId,
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

    await this.repositoryProfile.create(newProfile);

    return { success: true, data: newProfile };
  }

  async ChangeProfileDataById(
    data: IProfileData,
    id: string,
  ): Promise<IServiceResponse<IProfile, ProfileError>> {
    const profile = await this.repositoryProfile.findOne({ userId: id });

    if (!profile) {
      return { success: false, error: ProfileError.USER_NOT_FOUND };
    }

    const result = await this.repositoryProfile.update(
      { userId: id },
      { ...profile, data },
    );

    if (!result) {
      return { success: false, error: ProfileError.USER_NOT_FOUND };
    }

    return { success: true, data: { ...profile, data } };
  }

  async ChangeStudyPlanById(
    data: IModule[],
    id: string,
  ): Promise<IServiceResponse<IProfile, ProfileError>> {
    const profile = await this.repositoryProfile.findOne({ userId: id });

    if (!profile) {
      return { success: false, error: ProfileError.USER_NOT_FOUND };
    }

    const result = await this.repositoryProfile.update(
      { userId: id },
      { ...profile, studyPlanJSON: data },
    );

    if (!result) {
      return { success: false, error: ProfileError.USER_NOT_FOUND };
    }

    return { success: true, data: { ...profile, studyPlanJSON: data } };
  }

  async RemoveProfileById(
    id: string,
  ): Promise<IServiceResponse<null, ProfileError>> {
    const result = await this.repositoryProfile.delete({ userId: id });

    if (!result) {
      return { success: false, error: ProfileError.USER_NOT_FOUND };
    }

    return { success: true };
  }
}
