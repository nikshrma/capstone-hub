import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isAppError = err instanceof AppError && err.isOperational;
  const statusCode = isAppError ? err.statusCode : 500;

  // Log raw error on the server console for debugging
  console.error('[Error Handler]', err);

  let userSafeMessage = 'Internal Server Error';

  if (isAppError) {
    userSafeMessage = err.message;
  } else if (err.message && (err.message.includes("Can't reach database server") || err.name?.includes('PrismaClient'))) {
    userSafeMessage = 'Database service is currently unreachable. Please check the database server.';
  } else if (config.nodeEnv === 'development') {
    // In dev, provide a clean single-line description without raw Prisma queries or file paths
    userSafeMessage = err.message ? err.message.split('\n').filter(Boolean).pop()?.trim() || 'Internal Server Error' : 'Internal Server Error';
  } else {
    userSafeMessage = 'An unexpected server error occurred. Please try again later.';
  }

  const response: {
    success: boolean;
    message: string;
    stack?: string;
  } = {
    success: false,
    message: userSafeMessage,
  };

  if (config.nodeEnv === 'development' && !isAppError) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
