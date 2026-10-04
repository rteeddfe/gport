import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface UploadedFileView {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Public URL to reference from settings/policies. */
  url: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): Promise<UploadedFileView> {
    const saved = await this.prisma.uploadedFile.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        // Copy into a plain Uint8Array<ArrayBuffer> (Prisma Bytes input);
        // the multer Buffer may be backed by a SharedArrayBuffer view.
        data: new Uint8Array(file.buffer),
      },
    });
    return {
      id: saved.id,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      url: `/files/${saved.id}`,
    };
  }

  async load(
    id: string,
  ): Promise<{ filename: string; mimeType: string; data: Buffer }> {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    this.logger.debug(`Serving file ${file.id} (${file.mimeType})`);
    return {
      filename: file.filename,
      mimeType: file.mimeType,
      // Prisma Bytes arrives as a Buffer through the pg adapter.
      data: Buffer.from(file.data),
    };
  }
}
