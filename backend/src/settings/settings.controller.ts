import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import {
  SettingsService,
  type SiteSettingsView,
} from './settings.service.js';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Public read: the storefront renders from this (metadata, footer,
   * robots.txt, manifest). Only writes are admin-gated. */
  @Public()
  @Get()
  find(): Promise<SiteSettingsView> {
    return this.settingsService.find();
  }
}
