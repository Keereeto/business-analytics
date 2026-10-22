import { Router } from 'express';
import { pool } from '../db/pool.js';
import isNonEmptyString from '../utils/check_empty_string.js';

const router = Router();

/*
curl -i http://localhost:3000/system_logs
*/

// GET /system_logs — Health
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'System Logs API endpoint'
  });
});

/*
curl -X POST http://localhost:3000/system_logs/count \
     -H "Content-Type: application/json" \
     -d '{"user_id": 1, "action": "UPDATE", "entity_type": "task", "entity_id": 1, "details": "completed"}'
*/

// POST /system_logs/count — Count matching system logs
router.post('/count', (_req, res) => {
  const { user_id, action, entity_type, entity_id, details } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (user_id !== undefined && user_id !== null && user_id !== '') {
    count++;
    conditions.push('user_id = $' + count);
    params.push(user_id);
  }
  if (isNonEmptyString(action)) {
    count++;
    conditions.push('action = $' + count);
    params.push(action);
  }
  if (isNonEmptyString(entity_type)) {
    count++;
    conditions.push('entity_type = $' + count);
    params.push(entity_type);
  }
  if (entity_id !== undefined && entity_id !== null && entity_id !== '') {
    count++;
    conditions.push('entity_id = $' + count);
    params.push(entity_id);
  }
  if (isNonEmptyString(details)) {
    count++;
    conditions.push('details::TEXT LIKE $' + count);
    params.push(`%${details}%`);
  }

  // Build the query
  let sql = 'SELECT COUNT(*) FROM system_logs';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to count system logs:', err);
      return res.status(500).json({ error: 'Failed to count system logs' });
    }
    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/system_logs/filter \
     -H "Content-Type: application/json" \
     -d '{"user_id": 1, "action": "UPDATE", "entity_type": "task", "entity_id": 1, "details": "completed", "limit": 10, "page": 1, "sort": "created_at"}'
*/

// POST /system_logs/filter — Filter system logs
router.post('/filter', (_req, res) => {
  const { user_id, action, entity_type, entity_id, details, limit, page, sort } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (user_id !== undefined && user_id !== null && user_id !== '') {
    count++;
    conditions.push('user_id = $' + count);
    params.push(user_id);
  }
  if (isNonEmptyString(action)) {
    count++;
    conditions.push('action = $' + count);
    params.push(action);
  }
  if (isNonEmptyString(entity_type)) {
    count++;
    conditions.push('entity_type = $' + count);
    params.push(entity_type);
  }
  if (entity_id !== undefined && entity_id !== null && entity_id !== '') {
    count++;
    conditions.push('entity_id = $' + count);
    params.push(entity_id);
  }
  if (isNonEmptyString(details)) {
    count++;
    conditions.push('details::TEXT LIKE $' + count);
    params.push(`%${details}%`);
  }

  // Build the query
  let sql = 'SELECT * FROM system_logs';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  if (sort) {
    const allowed = ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'created_at'];
    if (allowed.includes(sort)) {
      sql += ' ORDER BY ' + sort;
    }
  } else {
    sql += ' ORDER BY id';
  }

  // Pagination
  const parsedLimit = Number(limit);
  const parsedPage = Number(page);

  if (limit !== undefined || page !== undefined) {
    if (
      !Number.isSafeInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100 ||
      !Number.isSafeInteger(parsedPage) ||
      parsedPage < 1
    ) {
      return res.status(400).json({
        error: 'Limit must be 1–100 and page must be a positive integer'
      });
    }
  }

  if (limit !== undefined && page !== undefined) {
    count++;
    const offset = (parsedPage - 1) * parsedLimit;
    sql += ' LIMIT $' + count + ' OFFSET $' + (count + 1);
    params.push(parsedLimit, offset);
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to filter system logs:', err);
      return res.status(500).json({ error: 'Failed to filter system logs' });
    }
    res.json(results.rows);
  });
});

export default router;