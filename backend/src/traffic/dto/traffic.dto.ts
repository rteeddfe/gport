import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTrafficSettingsDto {
  @IsBoolean()
  autoBanEnabled: boolean;

  @IsInt()
  @Min(10)
  @Max(100_000)
  banThresholdRequests: number;

  @IsInt()
  @Min(5)
  @Max(3600)
  banWindowSeconds: number;

  /** 0 = permanent ban. */
  @IsInt()
  @Min(0)
  @Max(43_200)
  banDurationMinutes: number;
}

export class BanIpDto {
  /** Exact IP (v4/v6) or an IPv4 CIDR subnet («185.220.0.0/16»). */
  @IsString()
  @MaxLength(45)
  @Matches(
    /^(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?|[0-9A-Fa-f:]{2,45})$/,
    { message: 'IP или CIDR-подсеть: 1.2.3.4, 185.220.0.0/16, ::1' },
  )
  ip: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string | null;

  /** Minutes until the ban lifts; null/undefined = permanent. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43_200)
  minutes?: number | null;
}
