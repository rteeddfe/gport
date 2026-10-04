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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto.js';
import { PromoCodesQueryDto } from './dto/promo-codes-query.dto.js';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto.js';
import {
  PaginatedPromoCodes,
  PromoCodesService,
} from './promo-codes.service.js';

@ApiTags('admin/promo-codes')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@RequirePermissions('promo-codes')
@Controller('admin/promo-codes')
export class AdminPromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Get()
  findMany(@Query() query: PromoCodesQueryDto): Promise<PaginatedPromoCodes> {
    return this.promoCodesService.findMany(query.page, query.limit);
  }

  @Post()
  create(@Body() dto: CreatePromoCodeDto) {
    return this.promoCodesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.promoCodesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.promoCodesService.remove(id);
  }
}
