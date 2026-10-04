import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { FaqService, type FaqItem } from './faq.service.js';
import { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq-item.dto.js';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Public()
  @Get()
  findActive(): Promise<FaqItem[]> {
    return this.faqService.findActive();
  }
}

@ApiTags('faq')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/faq')
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  findMany(): Promise<FaqItem[]> {
    return this.faqService.findMany();
  }

  @Post()
  create(@Body() dto: CreateFaqItemDto): Promise<FaqItem> {
    return this.faqService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqItemDto,
  ): Promise<FaqItem> {
    return this.faqService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.faqService.remove(id);
  }
}
