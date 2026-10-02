import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

function collectFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      Object.assign(result, collectFieldErrors(error.children, path));
    }
  }
  return result;
}

/**
 * Global DTO validation: whitelist unknown props, reject non-whitelisted ones,
 * transform plain objects/queries into DTO instances, and report errors per field.
 */
export function buildApiValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        message: 'Validation failed',
        errors: collectFieldErrors(errors),
      }),
  });
}
