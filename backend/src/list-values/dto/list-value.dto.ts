import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** The fixed list kinds of the «Списки» registry (constants in code —
 * the admin fills values, never kinds). */
export const LIST_KINDS = [
  'tags',
  'platform',
  'genre',
  'consoles',
  'subscription-group',
  'subscription-includes',
] as const;

export class CreateListValueDto {
  @IsIn(LIST_KINDS)
  kind: (typeof LIST_KINDS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  /** Defaults to slugify(name). Latin lowercase + dashes. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be latin lowercase words separated by dashes',
  })
  @MaxLength(100)
  slug?: string;
}

export class UpdateListValueDto extends PartialType(CreateListValueDto) {}
