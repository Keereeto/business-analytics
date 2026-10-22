import app from './app.js';
import { pool } from './db/pool.js';
import { config } from './config/env.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Business Analytics API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);

  server.close(async () => {
    try {
      await pool.end();
      process.exitCode = 0;
    } catch (error) {
      console.error('Error closing database pool:', error.message);
      process.exitCode = 1;
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));