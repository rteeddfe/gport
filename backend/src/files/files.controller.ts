import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { FilesService, type UploadedFileView } from './files.service.js';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// SVG is deliberately not allowed: served inline it executes as a document
// on the API origin (stored XSS — the cookies ride on that origin).
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/x-icon',
]);

@ApiTags('files')
@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /** Admin uploads feed the site settings (logo, og:image, favicons). */
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @RequirePermissions('files')
  @Post('admin/uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            callback(
              new BadRequestException(
                'Unsupported file type — png, jpeg, webp or ico only',
              ),
              false,
            );
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  upload(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UploadedFileView> {
    if (!file) {
      throw new BadRequestException('The "file" field is required');
    }
    return this.filesService.create(file);
  }

  /** Public, immutable delivery: uploaded files are never mutated. */
  @Public()
  @Get('files/:id')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.filesService.load(id);
    response
      .setHeader('Content-Type', file.mimeType)
      .setHeader('Content-Length', file.data.length)
      .setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      .setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(file.filename)}"`,
      )
      .end(file.data);
  }
}
