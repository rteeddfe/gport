import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Callback from the test acquiring emulator (server-to-server, HMAC
 * signed — the same shape a real acquirer's webhook would carry). */
export class TestWebhookDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MinLength(8)
  paymentToken: string;

  @IsIn(['success', 'cancel'])
  status: 'success' | 'cancel';

  /** HMAC-SHA256 of `${orderId}:${paymentToken}:${status}` with the
   * shared webhook secret. */
  @IsString()
  @MaxLength(128)
  signature: string;
}
