import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  ListValuesService,
  type ListValueRow,
} from './list-values.service.js';
import { CreateListValueDto, UpdateListValueDto } from './dto/list-value.dto.js';

@ApiTags('admin/list-values')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('products')
@Controller('admin/list-values')
export class AdminListValuesController {
  constructor(private readonly listValuesService: ListValuesService) {}

  @Post()
  create(@Body() dto: CreateListValueDto): Promise<ListValueRow> {
    return this.listValuesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListValueDto,
  ): Promise<ListValueRow> {
    return this.listValuesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.listValuesService.remove(id);
  }
}
