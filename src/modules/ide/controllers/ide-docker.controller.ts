import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  Controller,
  Post,
  Delete,
  Body,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DockerService, IContainerResult } from '@services/dockerService';
import { DockerError } from '@services/dockerService/types/Error.types';
import { FileNode, IProject } from '@models/project';
import { IControllerResponse } from '@core/types/Response.type';

@Controller('ide/docker')
@UseGuards(AuthGuard('jwt'))
export class IdeDockerController {
  constructor(private readonly dockerService: DockerService) {}

  @Post('run')
  async createAndRunContainer(
    @Request() req,
    @Body() data: { project: IProject },
  ): Promise<IControllerResponse<IContainerResult>> {
    if (!data.project?.meta || !Array.isArray(data.project.dir))
      throw new BadRequestException('Invalid project');
    data.project.userId = req.user.userId;
    this.dockerService.validateProject(data.project);
    const mockDockerCode = this.buildDockerfile(data.project.dir);

    const result = await this.dockerService.createAndRunContainer(
      data.project,
      mockDockerCode,
    );

    if (!result.success) {
      throw new BadRequestException(
        'An error occurred while attempting to start the container',
      );
    }

    return result;
  }

  private buildDockerfile(dir: FileNode[] | undefined): string {
    let copySource = '.';

    const hasSrcFolder = (dir || []).some(
      (node) => node.type === 'folder' && node.name === 'src',
    );

    if (hasSrcFolder) {
      copySource = 'src/';
    } else if ((dir || []).some((node) => node.name === 'main.py')) {
      copySource = '.';
    }

    return `FROM python:3.11-slim
            WORKDIR /app
            COPY ${copySource} .
            CMD ["tail", "-f", "/dev/null"]`;
  }

  @Post('send')
  async sendInputToContainer(
    @Request() req,
    @Body() data: { containerId: string; input: string },
  ) {
    await this.dockerService.assertOwner(data.containerId, req.user.userId);
    if (typeof data.input !== 'string' || data.input.length > 65536)
      throw new BadRequestException('Invalid input');
    const result = await this.dockerService.sendInputToContainer(
      data.containerId,
      data.input,
    );

    if (!result.success) {
      throw new BadRequestException(
        'An error occurred while attempting to start the container',
      );
    }

    return result;
  }

  @Post('stop')
  async stopContainer(@Request() req, @Body() data: { containerId: string }) {
    await this.dockerService.assertOwner(data.containerId, req.user.userId);
    const result = await this.dockerService.stopContainer(data.containerId);

    if (result.success) {
      return result;
    }

    if (result.error === DockerError.CONTAINER_NOT_FOUND) {
      throw new NotFoundException('Container not found');
    }

    if (result.error === DockerError.INVALID_CONTAINER_ID) {
      throw new BadRequestException('Invalid container id');
    }

    throw new BadRequestException('Failed to stop the container');
  }

  @Delete()
  async removeContainer(@Request() req, @Body() data: { containerId: string }) {
    return this.stopContainer(req, data);
  }
}
