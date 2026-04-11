import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IModule, IStep } from '@models/profile/Profile.model';
import { StudyService } from '@services/studyService/StudyService';
import { ProfileService } from '@services/profileService';
import { IControllerResponse } from '@core/types/Response.type';
import { INotation } from '@core/types/Notation.type';
import { IQuiz } from '@models/quiz/Quiz.model';

@Controller('study')
@UseGuards(AuthGuard('jwt'))
export class StudyController {
  constructor(
    private readonly studyService: StudyService,
    private readonly profileService: ProfileService,
  ) {}

  @Post('modules')
  async generateStudyModule(
    @Request() req,
  ): Promise<IControllerResponse<IModule[]>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    console.log(result, profile);

    if (!result.success || !profile) {
      throw new NotFoundException(result.error);
    }

    if (profile.studyPlanJSON.length !== 0) {
      throw new BadRequestException('Study plan already formed');
    }

    const resultGenerated = await this.studyService.generateStudyModules(
      profile.study.programmingLanguage,
    );

    const modules = resultGenerated.data;

    if (!resultGenerated.success || !modules) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate modules',
      );
    }

    const newStudyPlan: IModule[] = [];

    modules.forEach((module) => {
      newStudyPlan.push({
        ...module,
        levels: [],
      });
    });

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      newStudyPlan,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: newStudyPlan };
  }

  @Post('levels')
  async generateStudyLevels(
    @Request() req,
    @Body() data: { moduleIndex: number },
  ): Promise<IControllerResponse<INotation[]>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    if (!result.success || !profile) {
      throw new NotFoundException(result.error);
    }

    if (profile.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (profile.studyPlanJSON.length < data.moduleIndex) {
      throw new NotFoundException('Study plan not found');
    }

    const module = profile.studyPlanJSON[data.moduleIndex];

    const resultGenerated = await this.studyService.generateStudyLevels(
      module,
      profile.study.programmingLanguage,
    );

    const levels = resultGenerated.data;

    if (!resultGenerated.success || !levels) {
      throw new BadRequestException(
        result.error || 'Failed to generate levels',
      );
    }

    levels.forEach((level) => {
      module.levels?.push({
        ...level,
        steps: [],
      });
    });

    profile.studyPlanJSON[data.moduleIndex] = module;

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      profile.studyPlanJSON,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: levels };
  }

  @Post('steps')
  async generateStudySteps(
    @Request() req,
    @Body() data: { moduleIndex: number; levelIndex: number },
  ): Promise<IControllerResponse<IStep[]>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    if (!result.success || !profile) {
      throw new NotFoundException(result.error);
    }

    if (profile.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (profile.studyPlanJSON.length < data.moduleIndex) {
      throw new NotFoundException('Study plan not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels.length < data.levelIndex
    ) {
      throw new NotFoundException('Study plan not found');
    }

    const module = profile.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];

    const resultGenerated = await this.studyService.generateStudySteps(
      module,
      level,
      profile.study.programmingLanguage,
    );

    const steps = resultGenerated.data;

    if (!resultGenerated.success || !steps) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate steps',
      );
    }

    steps.forEach((step) => {
      level.steps.push(step);
    });

    profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex] = level;

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      profile.studyPlanJSON,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: steps };
  }

  @Post('steps/doc')
  async generateStepDocumentation(
    @Request() req,
    @Body()
    data: { moduleIndex: number; levelIndex: number; stepIndex: number },
  ): Promise<IControllerResponse<string>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    if (!result.success || !profile) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (profile.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (profile.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = profile.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generateDocumentation(
      module,
      level,
      step,
      profile.study.programmingLanguage,
    );

    const document = resultGenerated.data;

    if (!resultGenerated.success || !document) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate document',
      );
    }

    profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].document = document;

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      profile.studyPlanJSON,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: document };
  }

  @Post('steps/code')
  async generateStepPractice(
    @Request() req,
    @Body()
    data: { moduleIndex: number; levelIndex: number; stepIndex: number },
  ): Promise<IControllerResponse<string>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    if (!result.success || !profile) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (profile.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (profile.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = profile.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generatePractice(
      module,
      level,
      step,
      profile.study.programmingLanguage,
    );

    const practice = resultGenerated.data;

    if (!resultGenerated.success || !practice) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate practice',
      );
    }

    profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].code = practice;

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      profile.studyPlanJSON,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return {
      success: true,
      data: practice,
    };
  }

  @Post('steps/quiz')
  async generateStepQuiz(
    @Request() req,
    @Body()
    data: { moduleIndex: number; levelIndex: number; stepIndex: number },
  ): Promise<IControllerResponse<IQuiz>> {
    const result = await this.profileService.getProfileById(req.user.userId);

    const profile = result.data;

    if (!result.success || !profile) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (profile.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (profile.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = profile.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generateQuiz(
      module,
      level,
      step,
      profile.study.programmingLanguage,
    );

    const quiz = resultGenerated.data;

    if (!resultGenerated.success || !quiz) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate quiz',
      );
    }

    profile.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].quiz = quiz;

    const resultChanged = await this.profileService.ChangeStudyPlanById(
      profile.studyPlanJSON,
      req.user.userId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: quiz };
  }
}
