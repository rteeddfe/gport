import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export { trim };

/** Mirrors the public submission form (schemas/review.schema.ts on the
 * frontend). Values are trimmed before validation so whitespace-only
 * texts and padded names never pass the length checks; the backend
 * re-validates everything and rate-limits on top. */
export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  /** Optional display name; stored as «Гость» when empty. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  authorName?: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: 'text must be longer than or equal to 10 characters' })
  @MaxLength(500)
  text: string;
}
