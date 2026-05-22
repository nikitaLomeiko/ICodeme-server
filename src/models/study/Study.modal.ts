import { BaseEntity } from '@core/types/BaseEntity.abstract';
import { INotation } from '@core/types/Notation.type';
import { IQuiz } from './types/Quiz.types';

export interface IStudy extends BaseEntity {
  userId: string;
  levelPlanJSON: IPosition[];
  level: IPosition;
  studyPlanJSON: IModule[];
  study: IPlan;
}

export interface IPlan {
  programmingLanguage: string;
  module: number;
  moduleTitle: string;
  level: number;
  levelTitle: string;
  step: number;
}

export interface IPosition {
  experienceToNextLevel: number;
  positionCount: number;
  positionName: string;
}

export interface IModule extends INotation {
  levels: ILevel[];
}

export interface ILevel extends INotation {
  steps: IStep[];
}

export interface IStep extends INotation {
  type: 'document' | 'code' | 'quiz' | 'exam';
  document?: string;
  code?: string;
  quiz?: IQuiz;
  exam?: IQuiz;
  // experience: number;
}

export const StudyKey = 'Study';
