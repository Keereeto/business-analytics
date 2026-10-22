import { Router } from 'express';
import { pool } from '../db/pool.js';
import { sendCsv } from '../utils/csv.js';

const router = Router();

/*
curl -i http://localhost:3000/reports
*/

// GET /reports — Health
router.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Report API endpoint'
  });
});

/*
curl -i http://localhost:3000/reports/progress_by_dept
*/

// GET /projects/progress_by_dept — Get Progress By Department Report
router.get('/progress_by_dept', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  // Build the query
  let sql = `
    SELECT
      p.department,
      COUNT(DISTINCT p.id) AS total_projects,
      COUNT(t.id) AS total_tasks,
      ROUND(AVG(t.progress), 2) AS average_progress
    FROM projects p
    LEFT JOIN tasks t
      ON t.project_id = p.id
    GROUP BY p.department
    ORDER BY p.department;
  `;

  pool.query(sql, [], (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'department',
        'total_projects',
        'total_tasks',
        'average_progress'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'progress_by_dept.csv'
      );
    }

    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/reports/dept_rank_progress \
     -H "Content-Type: application/json" \
     -d '{"projects": 2, "tasks": 2}'
*/

// POST /projects/dept_rank_progress — Get Department Rank by Progress Report
router.post('/dept_rank_progress', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  const {
    projects, tasks
  } = _req.body ?? {};

  const conditions = [];
  const params = [];
  let count = 0;

  if (projects) {
    const numberOfProjects = Number(projects);
    if (!Number.isSafeInteger(numberOfProjects) || numberOfProjects < 1) {
      return res.status(400).json({ error: 'Invalid number of projects criteria' });
    } else {
      count++;
      conditions.push('COUNT(DISTINCT p.id) >= $' + count);
      params.push(numberOfProjects);
    }
  }

  if (tasks) {
    const numberOfTasks = Number(tasks);
    if (!Number.isSafeInteger(numberOfTasks) || numberOfTasks < 1) {
      return res.status(400).json({ error: 'Invalid number of tasks criteria' });
    } else {
      count++;
      conditions.push('COUNT(t.id) >= $' + count);
      params.push(numberOfTasks);
    }
  }

  // Build the query
  let sql = `
    SELECT
      RANK() OVER (ORDER BY AVG(t.progress) DESC) as rank,
      p.department,
      COUNT(DISTINCT p.id) AS total_projects,
      COUNT(t.id) AS total_tasks,
      ROUND(AVG(t.progress), 2) AS average_progress
    FROM projects p
    LEFT JOIN tasks t
      ON t.project_id = p.id
    GROUP BY p.department
  `;

  if (conditions.length > 0) {
    sql += ' HAVING ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY p.department;';

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'rank',
        'department',
        'total_projects',
        'total_tasks',
        'average_progress'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'dept_rank_progress.csv'
      );
    }

    res.json(results.rows);
  });
});

/*
curl -i http://localhost:3000/reports/task_status_by_dept
*/

// GET /projects/task_status_by_dept — Get Task Status By Department Report
router.get('/task_status_by_dept', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  // Build the query
  let sql = `
    SELECT
      p.department,
      COUNT(t.id) AS total_tasks,
      COUNT(t.id) FILTER (
          WHERE t.status = 'completed'
      ) AS completed_tasks,
      COUNT(t.id) FILTER (
          WHERE t.status = 'in_progress'
      ) AS in_progress_tasks,
      COUNT(t.id) FILTER (
          WHERE t.status = 'blocked'
      ) AS blocked_tasks,
      COUNT(t.id) FILTER (
          WHERE t.status = 'todo'
      ) AS todo_tasks
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.department
    ORDER BY p.department
  `;

  pool.query(sql, [], (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'department',
        'total_tasks',
        'completed_tasks',
        'in_progress_tasks',
        'blocked_tasks',
        'todo_tasks'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'task_status_by_dept.csv'
      );
    }

    res.json(results.rows);
  });
});

/*
curl -i http://localhost:3000/reports/overdue_tasks
*/

// GET /projects/overdue_tasks — Get Overdue Tasks Report
router.get('/overdue_tasks', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  // Build the query
  let sql = `
    SELECT
      p.department,
      p.name AS project_name,
      t.title AS task_title,
      u.name AS assignee,
      t.status,
      t.progress,
      t.due_date
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.due_date < CURRENT_DATE
      AND t.status <> 'completed'
    ORDER BY t.due_date, p.department;
  `;

  pool.query(sql, [], (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'department',
        'project_name',
        'task_title',
        'assignee',
        'status',
        'progress',
        'due_date'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'overdue_tasks.csv'
      );
    }

    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/reports/upcoming_due_date \
     -H "Content-Type: application/json" \
     -d '{"days": 7}'
*/

// POST /projects/upcoming_due_date — Get Upcoming Due Date Report
router.post('/upcoming_due_date', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  const {
    days
  } = _req.body ?? {};

  let numberOfDays = 7;
  if (days) {
    const numberOfDaysTest = Number(days);
    if (!Number.isSafeInteger(numberOfDaysTest) || numberOfDaysTest < 1) {
      return res.status(400).json({ error: 'Invalid number of days criteria' });
    } else {
      numberOfDays = numberOfDaysTest;
    }
  }

  // Build the query
  let sql = `
    SELECT
      p.department,
      p.name AS project_name,
      t.title AS task_title,
      u.name AS assignee,
      t.status,
      t.progress,
      t.due_date
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.due_date >= CURRENT_DATE
      AND t.due_date <= CURRENT_DATE + $1::INTEGER
      AND t.status <> 'completed'
    ORDER BY t.due_date, p.department;
  `;

  pool.query(sql, [numberOfDays], (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'department',
        'project_name',
        'task_title',
        'assignee',
        'status',
        'progress',
        'due_date'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'upcoming_due_date.csv'
      );
    }

    res.json(results.rows);
  });
});

/*
curl -X POST http://localhost:3000/reports/employee_workload \
     -H "Content-Type: application/json" \
     -d '{"days": 30}'
*/

// POST /projects/employee_workload — Get Employee Workload Report
router.post('/employee_workload', async (_req, res) => {
  const format = _req.query.format ?? 'json';

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ error: 'Invalid report format' });
  }

  const {
    days
  } = _req.body ?? {};

  let numberOfDays = 30;
  if (days) {
    const numberOfDaysTest = Number(days);
    if (!Number.isSafeInteger(numberOfDaysTest) || numberOfDaysTest < 1) {
      return res.status(400).json({ error: 'Invalid number of days criteria' });
    } else {
      numberOfDays = numberOfDaysTest;
    }
  }

  // Build the query
  let sql = `
    SELECT
      u.name,
      u.department,
      COUNT(t.id) AS assigned_tasks,
      COUNT(t.id) FILTER (
          WHERE t.status = 'completed'
      ) AS completed_tasks,
      ROUND(AVG(t.progress), 2) AS average_progress
    FROM users u
    LEFT JOIN tasks t
      ON t.assignee_id = u.id
      AND t.created_at >= CURRENT_TIMESTAMP - ($1::INTEGER * INTERVAL '1 day')
    GROUP BY u.id, u.name, u.department
    ORDER BY u.department, u.name;
  `;

  pool.query(sql, [numberOfDays], (err, results) => {
    if (err) {
      console.error('Failed to fetch report:', err);
      return res.status(500).json({ error: 'Failed to fetch report' });
    }

    if (results.rowCount === 0) {
      return res.status(200).json({ message: 'No records found' });
    }

    if (format === 'csv') {
      const columns = [
        'name',
        'department',
        'assigned_tasks',
        'completed_tasks',
        'average_progress'
      ];

      return sendCsv(
        res,
        results.rows,
        columns,
        'employee_workload.csv'
      );
    }

    res.json(results.rows);
  });
});

export default router;