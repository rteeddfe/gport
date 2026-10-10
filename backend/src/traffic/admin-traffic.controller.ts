import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import {
  TrafficService,
  type TrafficSnapshot,
} from './traffic.service.js';
import { BanIpDto, UpdateTrafficSettingsDto } from './dto/traffic.dto.js';

@ApiTags('admin/traffic')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/traffic')
export class AdminTrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Get('status')
  status(): Promise<TrafficSnapshot> {
    return this.trafficService.snapshot();
  }

  @Put('settings')
  updateSettings(
    @Body() dto: UpdateTrafficSettingsDto,
  ): Promise<TrafficSnapshot['settings']> {
    return this.trafficService.updateSettings(dto);
  }

  @Post('bans')
  ban(@Body() dto: BanIpDto): Promise<unknown> {
    return this.trafficService.ban(dto.ip, {
      reason: dto.reason ?? null,
      minutes: dto.minutes ?? null,
      // The JWT carries the email; an actor email snapshot stays simple.
      createdBy: 'admin',
    });
  }

  @Delete('bans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unban(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.trafficService.unban(id);
  }
}
