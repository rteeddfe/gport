import { Body, Controller, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/client.js';
import { SettingsService, type SiteSettingsView } from './settings.service.js';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto.js';

@ApiTags('settings')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Full-object replace: the admin form submits every field at once. */
  @Put()
  update(@Body() dto: UpdateSiteSettingsDto): Promise<SiteSettingsView> {
    return this.settingsService.update(dto);
  }
}
