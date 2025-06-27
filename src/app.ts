import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import config from './config';

const app = express();

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
