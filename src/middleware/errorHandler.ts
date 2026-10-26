import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response<ApiResponse>,
  next: NextFunction
) => {
  console.error('Необработанная ошибка:', err);

  // Если ответ уже отправлен, передаем ошибку дальше
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : 'INTERNAL_SERVER_ERROR',
  });
};

export const notFoundHandler = (_: Request, res: Response) => {
  res.status(404).end();
};
