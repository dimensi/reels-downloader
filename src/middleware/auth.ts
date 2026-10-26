import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { notFoundHandler } from './errorHandler';

export const validateToken = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.query.token !== 'string' || req.query.token !== config.token) {
    return notFoundHandler(req, res);
  }

  next();
};
