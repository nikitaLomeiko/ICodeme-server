import { Injectable, NotFoundException } from '@nestjs/common';
import { Db } from 'mongodb';
import { BaseMongoRepository } from '@core/db';
import {
  IModule,
  IPosition,
  IProfile,
  ProfileKey,
} from '@models/profile/Profile.model';

@Injectable()
export class GamificationService {
  private repositoryProfile: BaseMongoRepository<IProfile>;

  constructor(db: Db) {
    const collectionProfile = db.collection(ProfileKey);
    this.repositoryProfile = new BaseMongoRepository<IProfile>(
      collectionProfile,
    );
  }

  async addExperienceByUserId(id: string, experience: number) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.stats.experience += experience;

    while (
      profile.stats.experience >
      profile.levelPlanJSON[profile.level.positionCount - 1]
        .experienceToNextLevel
    ) {
      profile.level = profile.levelPlanJSON[profile.level.positionCount];
    }

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Experience added successfully',
    };
  }

  async nextModuleByUserId(id: string) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (profile.study.module + 1 < profile.studyPlanJSON.length) {
      profile.study.module += 1;
      profile.study.level = 1;
      profile.study.step = 1;
    }

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Module added successfully',
    };
  }

  async nextLevelByUserId(id: string) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (
      !profile ||
      profile.studyPlanJSON[profile.study.module - 1].levels === undefined
    ) {
      throw new NotFoundException('Profile not found');
    }

    if (
      profile.study.level + 1 <
      (profile.studyPlanJSON[profile.study.module - 1].levels?.length || 0)
    ) {
      profile.study.level += 1;
      profile.study.step = 1;
    }

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Level added successfully',
    };
  }

  async nextStepByUserId(id: string) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const currentModule = profile.studyPlanJSON[profile.study.module - 1];
    const currentLevel = currentModule?.levels?.[profile.study.level - 1];
    const stepsLength = currentLevel?.steps?.length ?? 0;

    if (profile.study.step + 1 < stepsLength) {
      profile.study.step += 1;
    }

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Step added successfully',
    };
  }

  async setLevelPlanByUserId(id: string, plan: IPosition[]) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.levelPlanJSON = plan;

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Set level plan successfully',
    };
  }

  async setStudyPlanByUserId(id: string, plan: IModule[]) {
    const profile = await this.repositoryProfile.findOne({ _id: id });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    profile.studyPlanJSON = plan;

    await this.repositoryProfile.update({ _id: id }, { ...profile });

    return {
      success: true,
      profile,
      message: 'Set level plan successfully',
    };
  }
}
