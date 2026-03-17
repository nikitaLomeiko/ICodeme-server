import { BaseEntity } from '@core/types/BaseEntity.abstract';
import { INotation } from '@core/types/Notation.type';
import { IQuiz } from '@models/quiz/Quiz.model';

export interface IProfile extends BaseEntity {
  userId: string;
  data: IProfileData;
  level: IPosition;
  levelPlanJSON: IPosition[];
  studyPlanJSON: IModule[];
  study: IStudy;
  stats: IStats;
}

export interface IProfileData {
  avatar: string;
  status: string;
  about: string;
}

export interface IPosition {
  experienceToNextLevel: number;
  positionCount: number;
  positionName: string;
}

export interface IStudy {
  programmingLanguage: string;
  module: number;
  level: number;
  step: number;
}

export interface IStats {
  experience: number;
}

export interface IModule extends INotation {
  levels: ILevel[];
  //experience: number;
}

export interface ILevel extends INotation {
  steps: IStep[];
  //experience: number;
}

export interface IStep extends INotation {
  type: 'document' | 'code' | 'quiz' | 'exam';
  document?: string;
  code?: string;
  quiz?: IQuiz;
  exam?: IQuiz;
  //experience: number;
}

export const ProfileKey = 'profiles';
