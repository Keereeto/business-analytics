import { Router } from 'express';
import { pool } from '../db/pool.js';
import isNonEmptyString from '../utils/check_empty_string.js';

const router = Router();

/*
curl -i http://localhost:3000/user
*/

// GET /users — Health
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'User API endpoint'
  });
});

/*
curl -i http://localhost:3000/users/id/1
*/

// GET /users/id/:id — Get project
router.get('/id/:id', async (_req, res) => {
  const { id } = _req.params;

  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Build the query
  let sql = 'SELECT * FROM users WHERE id = $1';

  pool.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Failed to fetch user:', err);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/users/count \
     -H "Content-Type: application/json" \
     -d '{"name": "", "email": "", "department": ""}'
*/

// POST /users/count — Count matching users
router.post('/count', async (_req, res) => {
  const { name, email, department } = _req.body;

  const conditions = [];
  const params = [];
  let count = 0;

  if (isNonEmptyString(name)) {
    count++;
    conditions.push('name LIKE $' + count);
    params.push(`%${name}%`);
  }
  if (isNonEmptyString(email)) {
    count++;
    conditions.push('email LIKE $' + count);
    params.push(`%${email}%`);
  }
  if (isNonEmptyString(department)) {
    count++;
    conditions.push('department LIKE $' + count);
    params.push(`%${department}%`);
  }

  // Build the query
  let sql = 'SELECT COUNT(*) FROM users';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to count users:', err);
      return res.status(500).json({ error: 'Failed to count users' });
    }
    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/users/filter \
     -H "Content-Type: application/json" \
     -d '{"name": "", "email": "", "department": "", "limit": 10, "page": 1, "sort": ""}'   
*/

// POST /users/filter — Filter users
router.post('/filter', async (_req, res) => {
  const { name, email, department, limit, page, sort } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (isNonEmptyString(name)) {
    count++;
    conditions.push('name LIKE $' + count);
    params.push(`%${name}%`);
  }
  if (isNonEmptyString(email)) {
    count++;
    conditions.push('email LIKE $' + count);
    params.push(`%${email}%`);
  }
  if (isNonEmptyString(department)) {
    count++;
    conditions.push('department LIKE $' + count);
    params.push(`%${department}%`);
  }

  // Build the query
  let sql = 'SELECT * FROM users';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  if (sort) {
    const allowed = ['name', 'email', 'department', 'created_at'];
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
      console.error('Failed to filter users:', err);
      return res.status(500).json({ error: 'Failed to filter users' });
    }
    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/users/ \
     -H "Content-Type: application/json" \
     -d '{"name": "Gerald Saber", "email": "g.saber@analytics.com", "department": "DevOps"}'
*/

// POST /users — Add user
router.post('/', async (_req, res) => {
  const { name, email, department } = _req.body ?? {};

  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!isNonEmptyString(email)) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!isNonEmptyString(department)) {
    return res.status(400).json({ error: 'Department is required' });
  }

  const params = [name, email, department];

  // Build the query
  let sql = `
    INSERT INTO users
      (name, email, department)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to add user:', err);

      return res.status(500).json({ error: 'Failed to add user' });
    }

    return res.status(200).json(results.rows[0]);
  });
});

/*
curl -X PUT http://localhost:3000/users/id/4 \
     -H "Content-Type: application/json" \
     -d '{"name": "Gerald Saber", "email": "g.saber@analytics.com", "department": "DevOps"}'
*/

// PUT /users/id/:id — Update user
router.put('/id/:id', async (_req, res) => {
  const { id } = _req.params;
  const { name, email, department } = _req.body ?? {};

  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const conditions = [];
  const params = [];
  let count = 0;

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    count++;
    conditions.push('name = $' + count);
    params.push(name.trim());
  }
  if (email !== undefined) {
    if (!isNonEmptyString(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    count++;
    conditions.push('email = $' + count);
    params.push(email.trim());
  }
  if (department !== undefined) {
    if (!isNonEmptyString(department)) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    count++;
    conditions.push('department = $' + count);
    params.push(department.trim());
  }

  if (conditions.length < 1) return res.status(400).json({ error: 'There is no info to update' });

  params.push(userId);

  // Build the query
  let sql = 'UPDATE users SET ';
  sql += conditions.join(' , ');
  sql += ' WHERE id = $' + (count + 1);

  pool.query(sql, params, (err, results) => {console.log(results)
    if (err) {
      console.error('Failed to update user:', err);

      return res.status(500).json({ error: 'Failed to update user' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User updated successfully'
    });
  });
});

/*
curl -X DELETE http://localhost:3000/users/id/4
*/

// DELETE /users/id/:id
router.delete('/id/:id', async (_req, res) => {
  const { id } = _req.params;

  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Build the query
  let sql = 'DELETE FROM users WHERE id = $1';

  pool.query(sql, [userId], (err, results) => {console.log(results)
    if (err) {
      console.error('Failed to delete user:', err);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User deleted successfully'
    });
  });
});

export default router;