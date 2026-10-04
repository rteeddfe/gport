import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  HomeContentService,
  type HomeContentView,
} from './home-content.service.js';
import { UpdateHomeContentDto } from './dto/update-home-content.dto.js';

@ApiTags('home-content')
@Controller('home-content')
export class HomeContentController {
  constructor(private readonly homeContentService: HomeContentService) {}

  @Public()
  @Get()
  find(): Promise<HomeContentView> {
    return this.homeContentService.find();
  }
}

@ApiTags('home-content')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/home-content')
export class AdminHomeContentController {
  constructor(private readonly homeContentService: HomeContentService) {}

  @Put()
  update(@Body() dto: UpdateHomeContentDto): Promise<HomeContentView> {
    return this.homeContentService.update(dto);
  }
}
