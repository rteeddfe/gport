import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Full-object PUT: the admin form always submits every field at once. */
export class UpdateHomeContentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  kicker: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleAccent: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  ctaLabel: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  ctaHref: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  tiles: string[];
}
