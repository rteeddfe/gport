import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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

  /** TOPUP_* only: the account to credit (login, player ID). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  accountIdentifier?: string;
}
