import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import config from '../config';

export const validateToken = (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Токен авторизации обязателен',
      error: 'MISSING_TOKEN',
    });
  }

  if (token !== config.token) {
    return res.status(403).json({
      success: false,
      message: 'Неверный токен авторизации',
      error: 'INVALID_TOKEN',
    });
  }

  next();
}; 