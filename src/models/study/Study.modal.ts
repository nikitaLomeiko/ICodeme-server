import { BaseEntity } from '@core/types/BaseEntity.abstract';
import { INotation } from '@core/types/Notation.type';
import { IQuiz } from './types/Quiz.types';

export interface IStudy extends BaseEntity, INotation {
  userId: string;
  levelPlanJSON: IPosition[];
  level: IPosition;
  studyPlanJSON: IModule[];
  study: IPlan;
}

export interface IPlan {
  context: string;
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
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface IStep extends INotation {
  type: 'document' | 'code' | 'quiz' | 'exam';
  isCompleted: boolean;
  isCurrent: boolean;
  document?: string;
  position: { x: number; y: number };
  code?: string;
  quiz?: IQuiz;
  exam?: IQuiz;
  // experience: number;
}

export const StudyKey = 'Study';
