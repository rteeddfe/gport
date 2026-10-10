import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Direct purchase (no cart): one product + quantity + payment method.
 * TOPUP_NOMINAL adds variantId, TOPUP_AMOUNT adds amountCents, both
 * require accountIdentifier (the account to credit). */
export class CreateOrderDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;

  @IsString()
  @MaxLength(50)
  provider: string;

  /** Letter/email address for the receipt and the keys; defaults to the
   * account email. */
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  /** TOPUP_NOMINAL only: the chosen nominal of the product. */
  @IsOptional()
  @IsUUID()
  variantId?: string;

  /** TOPUP_AMOUNT only: the buyer-entered top-up amount (kopecks). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents?: number;

  /** Optional promo code — validated and priced on the backend; an
   * invalid code fails the whole request. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Промокод: латиница, цифры, "_" и "-"' })
  @MaxLength(40)
  promoCode?: string;

  /** TOPUP_* only: the account to credit (login, player ID). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  accountIdentifier?: string;
}
