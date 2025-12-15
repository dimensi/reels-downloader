import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import config from '../config';

export const validateToken = (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
  const token = req.query.token as string;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Токен авторизации обязателен',
      error: 'MISSING_TOKEN',
    });
    return;
  }

  if (token !== config.token) {
    res.status(403).json({
      success: false,
      message: 'Неверный токен авторизации',
      error: 'INVALID_TOKEN',
    });
    return;
  }

  next();
}; 