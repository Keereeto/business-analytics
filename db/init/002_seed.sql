-- Sample data for the Business Analytics System
-- Intended for a fresh database after 001_schema.sql.
-- Explicit IDs make query practice and expected results predictable.

BEGIN;

INSERT INTO users (name, email, department) VALUES
    ('Alice Chen',   'alice.chen@example.com',   'Engineering'),
    ('Bob Patel',    'bob.patel@example.com',    'Engineering'),
    ('Carla Gomez',  'carla.gomez@example.com',  'Analytics'),
    ('David Kim',    'david.kim@example.com',   'Analytics'),
    ('Emma Wilson',  'emma.wilson@example.com', 'Operations'),
    ('Farid Hassan', 'farid.hassan@example.com','Operations'),
    ('Grace Lee',    'grace.lee@example.com',    'Finance'),
    ('Henry Brown',  'henry.brown@example.com', 'Finance');

INSERT INTO projects
    (name, description, department, status, start_date, end_date)
VALUES
    ('Warehouse Platform', 'Inventory and warehouse management platform', 'Engineering', 'in_progress', '2026-08-01', NULL),
    ('Customer Analytics', 'Customer behavior reporting and dashboards', 'Analytics', 'in_progress', '2026-08-10', NULL),
    ('Delivery Optimization', 'Improve delivery planning and route efficiency', 'Operations', 'in_progress', '2026-07-15', NULL),
    ('Budget Forecast', 'Quarterly budget forecasting workflow', 'Finance', 'completed', '2026-06-01', '2026-09-15'),
    ('Data Quality Upgrade', 'Improve validation and data quality checks', 'Analytics', 'planned', '2026-11-01', NULL),
    ('Warehouse Mobile Scanner', 'Mobile scanning pilot', 'Engineering', 'planned', '2026-11-10', NULL),
    ('Operations KPI Dashboard', 'Operations performance dashboard', 'Operations', 'cancelled', '2026-05-01', '2026-06-15'),
    ('Annual Audit Preparation', 'Prepare documents and evidence for annual audit', 'Finance', 'in_progress', '2026-09-01', NULL),
    ('Internal Documentation', 'Engineering documentation refresh', 'Engineering', 'completed', '2026-05-01', '2026-07-01');

INSERT INTO tasks
    (project_id, assignee_id, title, description, status, progress, due_date)
VALUES
    (1, 1, 'Design database schema', 'Define core entities and relationships', 'completed', 100, '2026-08-12'),
    (1, 2, 'Implement project API', 'Implement project CRUD endpoints', 'in_progress', 60, '2026-10-28'),
    (1, 1, 'Configure deployment', 'Prepare container deployment configuration', 'todo', 0, '2026-11-05'),
    (1, 2, 'Integration testing', 'Test API and database integration', 'blocked', 25, '2026-11-08'),
    (2, 3, 'Prepare analytics dataset', 'Clean and prepare reporting data', 'completed', 100, '2026-08-25'),
    (2, 4, 'Build dashboard queries', 'Create SQL queries for dashboard metrics', 'in_progress', 70, '2026-10-25'),
    (2, 3, 'Validate dashboard metrics', 'Compare metrics with source data', 'in_progress', 40, '2026-10-30'),
    (3, 5, 'Review delivery workflow', 'Document current delivery process', 'completed', 100, '2026-08-05'),
    (3, 6, 'Analyze route efficiency', 'Identify route optimization opportunities', 'in_progress', 50, '2026-10-27'),
    (3, 5, 'Pilot optimized routes', 'Run a pilot using revised routes', 'todo', 0, '2026-11-12'),
    (4, 7, 'Collect budget inputs', 'Collect departmental forecasts', 'completed', 100, '2026-06-20'),
    (4, 8, 'Prepare forecast report', 'Compile and validate forecast report', 'completed', 100, '2026-08-15'),
    (8, 7, 'Collect audit evidence', 'Collect supporting documents', 'in_progress', 35, '2026-11-03'),
    (8, 8, 'Review financial controls', 'Review controls and evidence', 'todo', 0, '2026-11-15'),
    (9, 1, 'Document API endpoints', 'Write API usage documentation', 'completed', 100, '2026-06-10'),
    (9, 2, 'Review technical guides', 'Review and update technical guides', 'completed', 100, '2026-06-25'),
    (2, NULL, 'Confirm stakeholder requirements', 'Requirements review not yet assigned', 'todo', 0, '2026-11-01'),
    (6, NULL, 'Select scanner hardware', 'Compare scanner options before the project starts', 'todo', 0, '2026-11-20');

INSERT INTO system_logs
    (user_id, action, entity_type, entity_id, details, created_at)
VALUES
    (1, 'CREATE', 'project', 1, '{"name":"Warehouse Platform"}', '2026-08-01T09:00:00Z'),
    (2, 'UPDATE', 'task', 2, '{"field":"progress","old":40,"new":60}', '2026-10-18T03:30:00Z'),
    (3, 'CREATE', 'project', 2, '{"name":"Customer Analytics"}', '2026-08-10T08:15:00Z'),
    (5, 'UPDATE', 'task', 9, '{"field":"status","old":"todo","new":"in_progress"}', '2026-10-19T06:45:00Z'),
    (7, 'COMPLETE', 'project', 4, '{"status":"completed"}', '2026-09-15T10:00:00Z'),
    (NULL, 'BACKUP', 'system', NULL, '{"file":"backup_20261020.sql.gz"}', '2026-10-20T18:00:00Z');

-- Keep identity sequences ahead of the explicit IDs inserted above.
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT MAX(id) FROM projects));
SELECT setval(pg_get_serial_sequence('tasks', 'id'), (SELECT MAX(id) FROM tasks));
SELECT setval(pg_get_serial_sequence('system_logs', 'id'), (SELECT MAX(id) FROM system_logs));

COMMIT;
