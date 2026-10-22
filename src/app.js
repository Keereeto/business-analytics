import express from 'express';
import healthRouter from './routes/health.js';
import userRouter from './routes/users.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import reportsRouter from './routes/reports.js';
import systemLogsRouter from './routes/system_logs.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    name: 'Business Analytics API',
    version: '1.0.0',
  });
});

app.use('/health', healthRouter);
app.use('/users', userRouter);
app.use('/projects', projectsRouter);
app.use('/tasks', tasksRouter);
app.use('/reports', reportsRouter);
app.use('/system_logs', systemLogsRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
      },
    });
  }

  console.error('Unhandled request error:', err.message);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

export default app;