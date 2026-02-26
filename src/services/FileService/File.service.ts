import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FileService {
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  listFiles(directoryPath: string): string[] {
    return fs.readdirSync(directoryPath);
  }

  createDirectory(directoryPath: string): void {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }
}
