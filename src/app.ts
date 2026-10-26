import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import config from './config';
import { validateToken } from './middleware/auth';

const app = express();
app.disable('x-powered-by');

// Container health checks connect directly; never trust forwarded IP headers here.
app.use((req, res, next) => {
  const address = req.socket.remoteAddress;
  const isLoopback = address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
  if (isLoopback && req.path === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    return next();
  }
  return validateToken(req, res, next);
});

// Важно: включаем trust proxy для поддержки X-Forwarded-For (нужно для express-rate-limit и docker/proxy)
// https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/
app.set('trust proxy', 1); 

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.nodeEnv === 'development' ? '*' : false, // В продакшене настроить конкретные домены
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging в development режиме
if (config.nodeEnv === 'development') {
  app.use((req, _, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
  });
}

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware (должно быть в конце)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
