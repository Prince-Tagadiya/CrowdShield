import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware factory for validating request body against a Zod schema.
 * Returns 400 with detailed field-level errors on validation failure.
 *
 * @param schema - Zod schema to validate req.body against
 * @returns Express middleware function
 */
export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
    } else {
      const fieldErrors = result.error.issues.map((issue: z.core.$ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        details: fieldErrors,
      });
    }
  };
}
