import rateLimit from 'express-rate-limit';
import config from '../config';

export const downloadRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: `Превышен лимит запросов. Максимум ${config.rateLimitMaxRequests} запросов в ${
      config.rateLimitWindowMs / 60000
    } минут`,
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
