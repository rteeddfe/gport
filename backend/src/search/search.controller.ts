import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator.js';
import { SuggestDto } from './dto/suggest.dto.js';
import { SearchService, type SearchSuggestion } from './search.service.js';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('suggest')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  suggest(@Query() query: SuggestDto): Promise<SearchSuggestion> {
    return this.searchService.suggest(query.q);
  }
}
