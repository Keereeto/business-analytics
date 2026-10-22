import { Router } from 'express';
import { pool } from '../db/pool.js';
import isNonEmptyString from '../utils/check_empty_string.js';

const router = Router();

/*
curl -i http://localhost:3000/tasks
*/

// GET /tasks — Health
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Task API endpoint'
  });
});

/*
curl -i http://localhost:3000/tasks/id/1
*/

// GET /tasks/id/:id — Get task
router.get('/id/:id', (_req, res) => {
  const { id } = _req.params;

  const taskId = Number(id);
  if (!Number.isSafeInteger(taskId) || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  // Build the query
  let sql = 'SELECT * FROM tasks WHERE id = $1';

  pool.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error('Failed to fetch task:', err);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/tasks/count \
     -H "Content-Type: application/json" \
     -d '{"project_id": 1, "assignee_id": 1, "title": "", "status": "", "progress": ""}'
*/

// POST /tasks/count — Count matching tasks
router.post('/count', (_req, res) => {
  const { project_id, assignee_id, title, status, progress } =
    _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (project_id !== undefined && project_id !== '') {
    const projectId = Number(project_id);

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    count++;
    conditions.push('project_id = $' + count);
    params.push(projectId);
  }
  if (assignee_id !== undefined && assignee_id !== '') {
    const assigneeId = Number(assignee_id);

    if (!Number.isSafeInteger(assigneeId) || assigneeId < 1) {
      return res.status(400).json({ error: 'Invalid assignee ID' });
    }

    count++;
    conditions.push('assignee_id = $' + count);
    params.push(assigneeId);
  }
  if (isNonEmptyString(title)) {
    count++;
    conditions.push('title LIKE $' + count);
    params.push(`%${title}%`);
  }
  if (isNonEmptyString(status)) {
    const allowed = ['todo', 'in_progress', 'completed', 'blocked'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }
  if (progress !== undefined && progress !== '') {
    const taskProgress = Number(progress);

    if (!Number.isInteger(taskProgress) ||
        taskProgress < 0 || taskProgress > 100) {
      return res.status(400).json({
        error: 'Progress must be between 0 and 100'
      });
    }

    count++;
    conditions.push('progress = $' + count);
    params.push(taskProgress);
  }

  // Build the query
  let sql = 'SELECT COUNT(*) FROM tasks';

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to count tasks:', err);
      return res.status(500).json({ error: 'Failed to count tasks' });
    }

    res.json(results.rows[0]);
  });
});

/*
curl -X POST http://localhost:3000/tasks/filter \
     -H "Content-Type: application/json" \
     -d '{"project_id": 1, "assignee_id": "", "title": "", "status": "", "progress": "", "limit": 10, "page": 1, "sort": "created_at"}'
*/

// POST /tasks/filter — Filter tasks
router.post('/filter', (_req, res) => {
  const {
    project_id, assignee_id, title, status, progress,
    limit, page, sort
  } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (project_id !== undefined && project_id !== '') {
    const projectId = Number(project_id);

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    count++;
    conditions.push('project_id = $' + count);
    params.push(projectId);
  }
  if (assignee_id !== undefined && assignee_id !== '') {
    const assigneeId = Number(assignee_id);

    if (!Number.isSafeInteger(assigneeId) || assigneeId < 1) {
      return res.status(400).json({ error: 'Invalid assignee ID' });
    }

    count++;
    conditions.push('assignee_id = $' + count);
    params.push(assigneeId);
  }
  if (isNonEmptyString(title)) {
    count++;
    conditions.push('title LIKE $' + count);
    params.push(`%${title}%`);
  }
  if (isNonEmptyString(status)) {
    const allowed = ['todo', 'in_progress', 'completed', 'blocked'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }
  if (progress !== undefined && progress !== '') {
    const taskProgress = Number(progress);

    if (!Number.isInteger(taskProgress) ||
        taskProgress < 0 || taskProgress > 100) {
      return res.status(400).json({
        error: 'Progress must be between 0 and 100'
      });
    }

    count++;
    conditions.push('progress = $' + count);
    params.push(taskProgress);
  }

  // Build the query
  let sql = 'SELECT * FROM tasks';

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  if (sort) {
    const allowed = [
      'project_id', 'assignee_id', 'title',
      'status', 'progress', 'due_date', 'created_at', 'updated_at'
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
      console.error('Failed to filter tasks:', err);
      return res.status(500).json({ error: 'Failed to filter tasks' });
    }

    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/tasks/ \
     -H "Content-Type: application/json" \
     -d '{"project_id": 1, "title": "Configure database", "status": "in_progress", "progress": 50}'
*/

// POST /tasks — Add task
router.post('/', (_req, res) => {
  const {
    project_id, assignee_id, title, description,
    status, progress, due_date
  } = _req.body ?? {};

  const projectId = Number(project_id);

  if (
    project_id === undefined ||
    project_id === '' ||
    !Number.isSafeInteger(projectId) ||
    projectId < 1
  ) {
    return res.status(400).json({ error: 'Valid project ID is required' });
  }

  let assigneeId = null;

  if (assignee_id !== undefined && assignee_id !== null && assignee_id !== '') {
    assigneeId = Number(assignee_id);

    if (!Number.isSafeInteger(assigneeId) || assigneeId < 1) {
      return res.status(400).json({ error: 'Invalid assignee ID' });
    }
  }

  if (!isNonEmptyString(title)) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const taskStatus = status ?? 'todo';
  const taskProgress = progress ?? 0;
  const allowed = ['todo', 'in_progress', 'completed', 'blocked'];

  if (!allowed.includes(taskStatus)) {
    return res.status(400).json({ error: 'Invalid task status' });
  }

  if (!Number.isInteger(taskProgress) ||
      taskProgress < 0 || taskProgress > 100) {
    return res.status(400).json({
      error: 'Progress must be between 0 and 100'
    });
  }

  const params = [
    projectId, assigneeId, title.trim(), description ?? null,
    taskStatus, taskProgress, due_date || null
  ];

  // Build the query
  let sql = `
    INSERT INTO tasks
      (project_id, assignee_id, title, description, status, progress, due_date)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to add task:', err);

      if (err.code === '23503') {
        return res.status(400).json({
          error: 'Project or assignee does not exist'
        });
      }

      if (err.code === '22007' || err.code === '22008') {
        return res.status(400).json({ error: 'Invalid due date' });
      }

      return res.status(500).json({ error: 'Failed to add task' });
    }

    return res.status(200).json(results.rows[0]);
  });
});

/*
curl -X PUT http://localhost:3000/tasks/id/1 \
     -H "Content-Type: application/json" \
     -d '{"status": "completed", "progress": 100}'
*/

// PUT /tasks/id/:id — Update task
router.put('/id/:id', (_req, res) => {
  const { id } = _req.params;
  const {
    project_id, assignee_id, title, description,
    status, progress, due_date
  } = _req.body ?? {};

  const taskId = Number(id);
  if (!Number.isSafeInteger(taskId) || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  const conditions = [];
  const params = [];
  let count = 0;

  if (project_id !== undefined) {
    const projectId = Number(project_id);

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    count++;
    conditions.push('project_id = $' + count);
    params.push(projectId);
  }

  if (assignee_id !== undefined) {
    let assigneeId = null;

    if (assignee_id !== null && assignee_id !== '') {
      assigneeId = Number(assignee_id);

      if (!Number.isSafeInteger(assigneeId) || assigneeId < 1) {
        return res.status(400).json({ error: 'Invalid assignee ID' });
      }
    }

    count++;
    conditions.push('assignee_id = $' + count);
    params.push(assigneeId);
  }

  if (title !== undefined) {
    if (!isNonEmptyString(title)) {
      return res.status(400).json({ error: 'Invalid title' });
    }

    count++;
    conditions.push('title = $' + count);
    params.push(title.trim());
  }

  if (description !== undefined) {
    count++;
    conditions.push('description = $' + count);
    params.push(description);
  }

  if (status !== undefined) {
    const allowed = ['todo', 'in_progress', 'completed', 'blocked'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }

    count++;
    conditions.push('status = $' + count);
    params.push(status);
  }

  if (progress !== undefined) {
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({
        error: 'Progress must be between 0 and 100'
      });
    }

    count++;
    conditions.push('progress = $' + count);
    params.push(progress);
  }

  if (due_date !== undefined) {
    count++;
    conditions.push('due_date = $' + count);
    params.push(due_date || null);
  }

  if (conditions.length < 1) {
    return res.status(400).json({ error: 'There is no info to update' });
  }

  // Update timestamp
  conditions.push('updated_at = NOW()');

  params.push(taskId);

  // Build the query
  let sql = 'UPDATE tasks SET ';
  sql += conditions.join(' , ');
  sql += ' WHERE id = $' + (params.length);
  sql += ' RETURNING *';

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to update task:', err);

      if (err.code === '23503') {
        return res.status(400).json({
          error: 'Project or assignee does not exist'
        });
      }

      if (err.code === '22007' || err.code === '22008') {
        return res.status(400).json({ error: 'Invalid due date' });
      }

      return res.status(500).json({ error: 'Failed to update task' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({
      message: 'Task updated successfully'
    });
  });
});

/*
curl -X DELETE http://localhost:3000/tasks/id/1
*/

// DELETE /tasks/id/:id
router.delete('/id/:id', (_req, res) => {
  const { id } = _req.params;

  const taskId = Number(id);
  if (!Number.isSafeInteger(taskId) || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  // Build the query
  let sql = 'DELETE FROM tasks WHERE id = $1';

  pool.query(sql, [taskId], (err, results) => {
    if (err) {
      console.error('Failed to delete task:', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }

    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({
      message: 'Task deleted successfully'
    });
  });
});

export default router;