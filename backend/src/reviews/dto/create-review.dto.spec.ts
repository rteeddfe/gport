import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReviewDto } from './create-review.dto.js';

describe('CreateReviewDto', () => {
  it('trims before validating — whitespace-only text fails the length check', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 5,
      authorName: '  Анна  ',
      text: '            ',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'text')).toBe(true);
    expect(dto.authorName).toBe('Анна');
  });

  it('accepts a valid trimmed submission', async () => {
    const dto = plainToInstance(CreateReviewDto, {
      rating: 4,
      text: '   Всё пришло быстро, спасибо!   ',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.text).toBe('Всё пришло быстро, спасибо!');
  });
});
