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
import {
  PoliciesService,
  type PolicyPage,
  type PolicySummary,
} from './policies.service.js';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto.js';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Public()
  @Get()
  findMany(): Promise<PolicySummary[]> {
    return this.policiesService.findMany();
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string): Promise<PolicyPage> {
    return this.policiesService.findBySlug(slug);
  }
}

@ApiTags('policies')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/policies')
export class AdminPoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Post()
  create(@Body() dto: CreatePolicyDto): Promise<PolicyPage> {
    return this.policiesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ): Promise<PolicyPage> {
    return this.policiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.policiesService.remove(id);
  }
}
