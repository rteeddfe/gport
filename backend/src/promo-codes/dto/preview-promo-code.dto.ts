import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Public «применить промокод» preview (the checkout form validates the
 * code against the current subtotal before submitting the order). */
export class PreviewPromoCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Промокод: латиница, цифры, "_" и "-"',
  })
  code: string;

  /** The order subtotal the discount would apply to (kopecks). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  subtotalCents: number;
}
