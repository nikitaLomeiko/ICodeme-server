import { ChatSession } from '@core/ai';
import { BaseFileStorage } from '@core/storage';
import { INotation } from '@core/types/Notation.type';
import { IStep } from '@models/profile/Profile.model';
import { IQuiz } from '@models/quiz/Quiz.model';
import { Injectable } from '@nestjs/common';
import { applyPromptVariables } from './helpers/ApplyPromptVariables';
import { extractJsonFromMarkdown } from './helpers/ExtractJsonFromMarkdown';
import { TypeGuards as CoreTypeGuards } from '@core/types/guards/TypeGuards';
import { TypeGuards as ProfileTypeGuards } from '@models/profile/guards/TypeGuards';
import { TypeGuards as QuizTypeGuards } from '@models/quiz/guards/TypeGuards';
import { IServiceResponse } from '@core/types/Response.type';

@Injectable()
export class StudyService {
  private path = 'data/prompts';

  constructor(
    private chat: ChatSession,
    private fileStorage: BaseFileStorage,
  ) {}

  async generateStudyModules(
    language: string,
  ): Promise<IServiceResponse<INotation[], string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_modules.txt'),
      { language: language },
    );

    const answer = await this.chat.send(prompt);
    const json = extractJsonFromMarkdown(answer);

    try {
      const parsed = JSON.parse(json);

      if (!CoreTypeGuards.isNotationArray(parsed)) {
        return {
          success: false,
          error: 'AI response is not a valid array of modules (INotation[])',
        };
      }

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse modules: ${err}`,
      };
    }
  }

  async generateStudyLevels(
    module: INotation,
    language: string,
  ): Promise<IServiceResponse<INotation[], string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_levels.txt'),
      {
        language: language,
        module_title: module.title,
        module_description: module.description,
      },
    );

    const answer = await this.chat.send(prompt);
    const json = extractJsonFromMarkdown(answer);

    try {
      const parsed = JSON.parse(json);

      if (!CoreTypeGuards.isNotationArray(parsed)) {
        return {
          success: false,
          error: 'AI response is not a valid array of levels (INotation[])',
        };
      }

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse levels: ${err}`,
      };
    }
  }

  async generateStudySteps(
    module: INotation,
    level: INotation,
    language: string,
  ): Promise<IServiceResponse<IStep[], string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_steps.txt'),
      {
        language: language,
        module_title: module.title,
        module_description: module.description,
        level_title: level.title,
        level_description: level.description,
      },
    );

    const answer = await this.chat.send(prompt);
    const json = extractJsonFromMarkdown(answer);

    try {
      const parsed = JSON.parse(json);

      if (!ProfileTypeGuards.isStepArray(parsed)) {
        return {
          success: false,
          error: 'AI response is not a valid array of steps (INotation[])',
        };
      }

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse steps: ${err}`,
      };
    }
  }

  async generateDocumentation(
    module: INotation,
    level: INotation,
    step: INotation,
    language: string,
  ): Promise<IServiceResponse<string, string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_documentation.txt'),
      {
        language: language,
        module_title: module.title,
        module_description: module.description,
        level_title: level.title,
        level_description: level.description,
        step_title: step.title,
        step_description: step.description,
      },
    );

    const answer = await this.chat.send(prompt);

    return { success: true, data: answer };
  }

  async generatePractice(
    module: INotation,
    level: INotation,
    step: INotation,
    language: string,
  ): Promise<IServiceResponse<string, string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_practice.txt'),
      {
        language: language,
        module_title: module.title,
        module_description: module.description,
        level_title: level.title,
        level_description: level.description,
        step_title: step.title,
        step_description: step.description,
      },
    );

    const answer = await this.chat.send(prompt);

    return { success: true, data: answer };
  }

  async generateQuiz(
    module: INotation,
    level: INotation,
    step: INotation,
    language: string,
  ): Promise<IServiceResponse<IQuiz, string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/generate_quiz.txt'),
      {
        language: language,
        module_title: module.title,
        module_description: module.description,
        level_title: level.title,
        level_description: level.description,
        step_title: step.title,
        step_description: step.description,
      },
    );

    const answer = await this.chat.send(prompt);
    const json = extractJsonFromMarkdown(answer);

    try {
      const parsed = JSON.parse(json);

      if (!QuizTypeGuards.isQuiz(parsed)) {
        return {
          success: false,
          error: 'AI response is not a valid array of quiz (IQuiz)',
        };
      }

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse quiz: ${err}`,
      };
    }
  }

  async checkQuiz(
    quiz: IQuiz,
  ): Promise<IServiceResponse<IQuiz | number, string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/check_quiz.txt'),
      {
        quiz: JSON.stringify(quiz, null, 2),
      },
    );

    const answer = await this.chat.send(prompt);
    const trimmed = answer.trim();

    if (trimmed === '200') {
      return { success: true, data: 200 };
    }

    const json = extractJsonFromMarkdown(answer);

    try {
      const parsed = JSON.parse(json);

      if (!QuizTypeGuards.isQuiz(parsed)) {
        return {
          success: false,
          error: 'AI response is not a valid array of quiz (IQuiz)',
        };
      }

      return { success: true, data: parsed };
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse quiz: ${err}`,
      };
    }
  }

  async checkCode(
    task: INotation,
    code: string,
    language: string,
  ): Promise<IServiceResponse<number | string, string>> {
    const prompt = applyPromptVariables(
      this.fileStorage.readFile(this.path + '/check_code.txt'),
      {
        language: language,
        code: code,
        task_title: task.title,
        task_description: task.description,
      },
    );

    const answer = await this.chat.send(prompt);
    const trimmed = answer.trim();

    if (trimmed === '200') {
      return { success: true, data: 200 };
    }

    return { success: true, data: trimmed };
  }
}
