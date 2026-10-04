import { PartialType } from '@nestjs/swagger';
import { CreatePromoCodeDto } from './create-promo-code.dto.js';

export class UpdatePromoCodeDto extends PartialType(CreatePromoCodeDto) {}
