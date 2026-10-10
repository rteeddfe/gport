import { Module } from '@nestjs/common';

import {
  AdminListValuesController,
} from './admin-list-values.controller.js';
import { ListValuesController } from './list-values.controller.js';
import { ListValuesService } from './list-values.service.js';

@Module({
  controllers: [AdminListValuesController, ListValuesController],
  providers: [ListValuesService],
})
export class ListValuesModule {}
