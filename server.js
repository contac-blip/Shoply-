import express from 'express';
import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import router from './index.js';
import env from './env.js';
import { initSocket, emitNotification } from './socket.js';
import mockGateway from './src_js/fintech/mockGateway.js';
import db from './config/db.js';
import { startMerchantSummaryScheduler } from './src_js/scheduler/merchantSummaryScheduler.js';
import { requestId } from './requestId.js';
import { apiLimiter, authLimiter } from './rateLimiter.js';
import errorHandler from './errorHandler.js';
import logger from './logger.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-Id'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestId);
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - req.startTime,
      requestId: req.id,
      tenantId: req.tenantId || req.headers['x-tenant-id'] || null,
    });
  });
  next();
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Ensure the webhook route can access the raw body for signature verification
app.use('/api/momo/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Mount internal mock MTN gateway for deterministic testing
app.use('/mock-mtn', mockGateway);

// Mount API routes
app.use('/api', router);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', requestId: req.id }));

app.get('/health/db', async (req, res) => {
  try {
    await db.raw('select 1');
    return res.json({ status: 'ok', database: 'ok', requestId: req.id });
  } catch (err) {
    logger.error('Database health check failed:', err);
    return res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      requestId: req.id,
    });
  }
});

// Development helper: emit a test notification.
app.post('/emit-test', (req, res) => {
  const payload = req.body || {
    title: 'Test notification',
    message: 'This is a test notification from /emit-test',
    timestamp: new Date().toISOString(),
  };

  try {
    emitNotification(payload);
    res.json({ ok: true, payload, requestId: req.id });
  } catch (err) {
    logger.error('Emit test notification failed:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON payload', requestId: req.id });
  }
  return next(err);
});

app.use(errorHandler);

const PORT = process.env.PORT || env.PORT || 3000;
const server = http.createServer(app);
const io = initSocket(server);

const scheduler = startMerchantSummaryScheduler({
  db,
  intervalMs: 60000,
  loadMetrics: async () => {
    const hasOrdersTable = await db.schema.hasTable('orders');
    const hasProductsTable = await db.schema.hasTable('products');
    const hasReturnTable = await db.schema.hasTable('return_requests');

    const orders = hasOrdersTable ? await db('orders').select('*') : [];
    const stockLevels = hasProductsTable ? await db('products').select('stock_quantity', 'reorder_level') : [];
    const returnRequests = hasReturnTable ? await db('return_requests').select('*') : [];

    return {
      orders,
      stockLevels: stockLevels.map((item) => ({
        available_quantity: Number(item.stock_quantity || 0),
        reorder_level: Number(item.reorder_level || 0),
      })),
      returnRequests,
    };
  },
});

let isShuttingDown = false;
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`Received ${signal}. Shutting down gracefully...`);

  if (scheduler && typeof scheduler.stop === 'function') {
    scheduler.stop();
  }

  server.close((err) => {
    if (err) {
      logger.error('Error while closing HTTP server:', err);
      process.exit(1);
    }

    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 15000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

server.on('error', (err) => {
  // eslint-disable-next-line no-console
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Is another server running?`);
    console.error('If you want to free the port, find and stop the process using it (Windows: `netstat -ano | findstr :${PORT}` then `taskkill /PID <pid> /F`).');
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

try {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
  });
} catch (err) {
  // eslint-disable-next-line no-console
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Is another server running?`);
  } else {
    console.error('Failed to start server synchronously:', err);
  }
  process.exit(1);
}
