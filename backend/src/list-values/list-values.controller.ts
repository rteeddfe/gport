import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import {
  ListValuesService,
  type ListValueRow,
} from './list-values.service.js';

/** Public reads power the storefront display names and the catalog filter
 * labels; the admin product form reads the same endpoint. */
@ApiTags('list-values')
@Controller('list-values')
export class ListValuesController {
  constructor(private readonly listValuesService: ListValuesService) {}

  @Public()
  @Get()
  findMany(@Query('kind') kind?: string): Promise<ListValueRow[]> {
    return this.listValuesService.findMany(kind);
  }
}
