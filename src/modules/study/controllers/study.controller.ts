import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IModule, IStep, IStudy } from '@models/study';
import { StudyService } from '@services/studyService/StudyService';
import { IControllerResponse } from '@core/types/Response.type';
import { INotation } from '@core/types/Notation.type';
import { IQuiz } from '@models/study';

@Controller('study')
@UseGuards(AuthGuard('jwt'))
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get('me')
  async getMyStudy(@Request() req): Promise<IControllerResponse<IStudy[]>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    return result;
  }

  @Post('me')
  async createNewStudy(
    @Request() req,
    @Body() data: { programmingLanguage: string },
  ): Promise<IControllerResponse<IStudy>> {
    const result = await this.studyService.createNewStudy(
      data.programmingLanguage,
      req.user.userId,
    );

    if (!result.success) {
      throw new BadRequestException('Error when creating a study');
    }

    return result;
  }

  @Delete('me/:studyId')
  async deleteMyStudy(
    @Request() req,
    @Param('studyId') studyId: string,
  ): Promise<IControllerResponse> {
    const result = await this.studyService.removeStudyById(
      studyId,
      req.user.userId,
    );

    if (!result.success) {
      throw new NotFoundException(result.error);
    }

    return result;
  }

  @Post('modules')
  async generateStudyModule(
    @Request() req,
    @Body() data: { studyId: string },
  ): Promise<IControllerResponse<IModule[]>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error);
    }

    if (study.studyPlanJSON.length !== 0) {
      throw new BadRequestException('Study plan already formed');
    }

    const resultGenerated = await this.studyService.generateStudyModules(
      study.study.programmingLanguage,
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

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      newStudyPlan,
      data.studyId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: newStudyPlan };
  }

  @Post('levels')
  async generateStudyLevels(
    @Request() req,
    @Body() data: { moduleIndex: number; studyId: string },
  ): Promise<IControllerResponse<INotation[]>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error);
    }

    if (study.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON.length < data.moduleIndex) {
      throw new NotFoundException('Study plan not found');
    }

    const module = study.studyPlanJSON[data.moduleIndex];

    const resultGenerated = await this.studyService.generateStudyLevels(
      module,
      study.study.programmingLanguage,
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

    study.studyPlanJSON[data.moduleIndex] = module;

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      study.studyPlanJSON,
      data.studyId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: levels };
  }

  @Post('steps')
  async generateStudySteps(
    @Request() req,
    @Body() data: { moduleIndex: number; levelIndex: number; studyId: string },
  ): Promise<IControllerResponse<IStep[]>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error);
    }

    if (study.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON.length < data.moduleIndex) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON[data.moduleIndex].levels.length < data.levelIndex) {
      throw new NotFoundException('Study plan not found');
    }

    const module = study.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];

    const resultGenerated = await this.studyService.generateStudySteps(
      module,
      level,
      study.study.programmingLanguage,
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

    study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex] = level;

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      study.studyPlanJSON,
      data.studyId,
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
    data: {
      moduleIndex: number;
      levelIndex: number;
      stepIndex: number;
      studyId: string;
    },
  ): Promise<IControllerResponse<string>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (study.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = study.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generateDocumentation(
      module,
      level,
      step,
      study.study.programmingLanguage,
    );

    const document = resultGenerated.data;

    if (!resultGenerated.success || !document) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate document',
      );
    }

    study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].document = document;

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      study.studyPlanJSON,
      data.studyId,
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
    data: {
      moduleIndex: number;
      levelIndex: number;
      stepIndex: number;
      studyId: string;
    },
  ): Promise<IControllerResponse<string>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (study.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = study.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generatePractice(
      module,
      level,
      step,
      study.study.programmingLanguage,
    );

    const practice = resultGenerated.data;

    if (!resultGenerated.success || !practice) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate practice',
      );
    }

    study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].code = practice;

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      study.studyPlanJSON,
      data.studyId,
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
    data: {
      moduleIndex: number;
      levelIndex: number;
      stepIndex: number;
      studyId: string;
    },
  ): Promise<IControllerResponse<IQuiz>> {
    const result = await this.studyService.getStudyByUserId(req.user.userId);
    const study = result.data?.find((item) => item._id === data.studyId);

    if (!study) {
      throw new NotFoundException(result.error || 'Profile not found');
    }

    if (study.studyPlanJSON.length === 0) {
      throw new NotFoundException('Study plan not found');
    }

    if (study.studyPlanJSON.length <= data.moduleIndex) {
      throw new NotFoundException('Module not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels.length <= data.levelIndex
    ) {
      throw new NotFoundException('Level not found');
    }

    if (
      study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps
        .length <= data.stepIndex
    ) {
      throw new NotFoundException('Step not found');
    }

    const module = study.studyPlanJSON[data.moduleIndex];
    const level = module.levels[data.levelIndex];
    const step = level.steps[data.stepIndex];

    const resultGenerated = await this.studyService.generateQuiz(
      module,
      level,
      step,
      study.study.programmingLanguage,
    );

    const quiz = resultGenerated.data;

    if (!resultGenerated.success || !quiz) {
      throw new BadRequestException(
        resultGenerated.error || 'Failed to generate quiz',
      );
    }

    study.studyPlanJSON[data.moduleIndex].levels[data.levelIndex].steps[
      data.stepIndex
    ].quiz = quiz;

    const resultChanged = await this.studyService.ChangeStudyPlanById(
      study.studyPlanJSON,
      data.studyId,
    );

    if (!resultChanged.success) {
      throw new NotFoundException(resultChanged.error);
    }

    return { success: true, data: quiz };
  }
}
