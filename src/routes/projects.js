import { Router } from 'express';
import { pool } from '../db/pool.js';
import isNonEmptyString from '../utils/check_empty_string.js';

const router = Router();

/*
curl -i http://localhost:3000/projects
*/

// GET /projects — Health
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Project API endpoint'
  });
});

/*
curl -i http://localhost:3000/projects/id/1
*/

// GET /projects/id/:id — Get project
router.get('/id/:id', async (_req, res) => {
  const { id } = _req.params;

  const projectId = Number(id);
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  // Build the query
  let sql = 'SELECT * FROM projects WHERE id = $1';

  pool.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error('Failed to fetch project:', err);
      return res.status(500).json({ error: 'Failed to fetch project' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/projects/count \
     -H "Content-Type: application/json" \
     -d '{"name": "", "department": "", "status": ""}'
*/

// POST /projects/count — Count matching projects
router.post('/count', (_req, res) => {
  const { name, department, status } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (isNonEmptyString(name)) {
    count++;
    conditions.push('name LIKE $' + count);
    params.push(`%${name}%`);
  }
  if (isNonEmptyString(department)) {
    count++;
    conditions.push('department LIKE $' + count);
    params.push(`%${department}%`);
  }
  if (isNonEmptyString(status)) {
    const allowed = ['planned', 'in_progress', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }

  // Build the query
  let sql = 'SELECT COUNT(*) FROM projects';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to count projects:', err);
      return res.status(500).json({ error: 'Failed to count projects' });
    }
    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/projects/filter \
     -H "Content-Type: application/json" \
     -d '{"name": "", "department": "", "status": "", "limit": 10, "page": 1, "sort": "name"}'
*/

// POST /projects/filter — Filter projects
router.post('/filter', (_req, res) => {
  const { name, department, status, limit, page, sort } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (isNonEmptyString(name)) {
    count++;
    conditions.push('name LIKE $' + count);
    params.push(`%${name}%`);
  }
  if (isNonEmptyString(department)) {
    count++;
    conditions.push('department LIKE $' + count);
    params.push(`%${department}%`);
  }
  if (isNonEmptyString(status)) {
    const allowed = ['planned', 'in_progress', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }

  // Build the query
  let sql = 'SELECT * FROM projects';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  if (sort) {
    const allowed = [
      'name', 'department', 'status', 'start_date',
      'end_date', 'created_at'
    ];

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
      console.error('Failed to filter projects:', err);
      return res.status(500).json({ error: 'Failed to filter projects' });
    }
    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/projects/ \
     -H "Content-Type: application/json" \
     -d '{"name": "Warehouse Upgrade", "department": "IT", "status": "planned"}'
*/

// POST /projects — Add project
router.post('/', (_req, res) => {
  const {
    name, description, department, status, start_date, end_date
  } = _req.body ?? {};

  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!isNonEmptyString(department)) {
    return res.status(400).json({ error: 'Department is required' });
  }

  const projectStatus = status ?? 'planned';
  const allowed = ['planned', 'in_progress', 'completed', 'cancelled'];

  if (!allowed.includes(projectStatus)) {
    return res.status(400).json({ error: 'Invalid project status' });
  }

  const params = [
    name.trim(), description ?? null, department.trim(),
    projectStatus, start_date || null, end_date || null
  ];

  // Build the query
  let sql = `
    INSERT INTO projects
      (name, description, department, status, start_date, end_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to add project:', err);

      if (err.code === '23514' || err.code === '22007') {
        return res.status(400).json({ error: 'Invalid project data or dates' });
      }

      return res.status(500).json({ error: 'Failed to add project' });
    }

    return res.status(200).json(results.rows[0]);
  });
});

/*
curl -X PUT http://localhost:3000/projects/id/1 \
     -H "Content-Type: application/json" \
     -d '{"name": "Warehouse Upgrade", "department": "IT"}'
*/

// PUT /projects/id/:id — Update project
router.put('/id/:id', (_req, res) => {
  const { id } = _req.params;
  const {
    name, description, department, status, start_date, end_date
  } = _req.body ?? {};

  const projectId = Number(id);
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return res.status(400).json({ error: 'Invalid project ID' });
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
  if (description !== undefined) {
    count++;
    conditions.push('description = $' + count);
    params.push(description);
  }
  if (department !== undefined) {
    if (!isNonEmptyString(department)) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    count++;
    conditions.push('department = $' + count);
    params.push(department.trim());
  }

  if (status !== undefined) {
    const allowed = ['planned', 'in_progress', 'completed', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }

  if (start_date !== undefined) {
    count++;
    conditions.push('start_date = $' + count);
    params.push(start_date || null);
  }

  if (end_date !== undefined) {
    count++;
    conditions.push('end_date = $' + count);
    params.push(end_date || null);
  }

  if (conditions.length < 1) {
    return res.status(400).json({ error: 'There is no info to update' });
  }

  params.push(projectId);

  // Build the query
  let sql = 'UPDATE projects SET ';
  sql += conditions.join(' , ');
  sql += ' WHERE id = $' + (count + 1);

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to update project:', err);

      if (err.code === '23514' || err.code === '22007') {
        return res.status(400).json({ error: 'Invalid project data or dates' });
      }

      return res.status(500).json({ error: 'Failed to update project' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json({
      message: 'Project updated successfully'
    });
  });
});

/*
curl -X DELETE http://localhost:3000/projects/id/1
*/

// DELETE /projects/id/:id
router.delete('/id/:id', (_req, res) => {
  const { id } = _req.params;

  const projectId = Number(id);
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return res.status(400).json({ error: 'Invalid project ID' });
  }

  // Build the query
  let sql = 'DELETE FROM projects WHERE id = $1';

  pool.query(sql, [projectId], (err, results) => {
    if (err) {
      console.error('Failed to delete project:', err);
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json({
      message: 'Project deleted successfully'
    });
  });
});

export default router;