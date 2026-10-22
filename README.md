# Business Analytics API

A REST API for managing users, projects, and tasks, with PostgreSQL-backed reporting and system audit logs.

## Technologies

- Node.js and Express
- PostgreSQL
- Docker and Docker Compose
- SQL reporting and CSV export
- Bash scripts for database backup and system administration

## Requirements

- Docker Engine or Docker Desktop
- Docker Compose
- Git

Bash scripts require a Linux-compatible shell, such as Linux or WSL2 on Windows.

## Getting Started

1. Clone this repository.
2. Create a `.env` file using `.env.example` as a template.
3. Start the services:

   ```bash
   docker compose up -d --build
   ```

4. Check the service status:

   ```bash
   docker compose ps
   ```

5. Test the API:

   ```bash
   curl http://localhost:3000/health
   ```

The API is available at `http://localhost:3000`.

**Note:** Database initialization scripts run automatically only when PostgreSQL creates a new database data directory.

## API Endpoints

### Users

Base URL: `http://localhost:3000/users`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | Health |
| GET | `/users/id/:id` | Get a user by ID |
| POST | `/users/count` | Count matching users |
| POST | `/users/filter` | Filter users |
| POST | `/users` | Create a user |
| PUT | `/users/id/:id` | Update a user |
| DELETE | `/users/id/:id` | Delete a user |

#### 1. Get User API Status

**Method:** `GET`

**Endpoint:** `/users`

**Description:** Returns a message indicating the user API endpoint is accessible. Does not check database connectivity.

**Example Request**

```bash
curl -i http://localhost:3000/users
```

**Success Response — `200 OK`**

```json
{
  "message": "User API endpoint"
}
```

#### 2. Get User by ID

**Method:** `GET`

**Endpoint:** `/users/id/:id`

**Description:** Retrieves one user by their ID.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive user ID. |

**Example Request**

```bash
curl -i http://localhost:3000/users/id/1
```

**Success Response — `200 OK`**

Returns a JSON object containing `id`, `name`, `email`, `department`, and `created_at`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid user ID. |
| `404 Not Found` | User does not exist. |
| `500 Internal Server Error` | Database query fails. |

#### 3. Count Users

**Method:** `POST`

**Endpoint:** `/users/count`

**Description:** Counts users matching the supplied filters. All filters are optional and are combined using `AND`.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | No | Partial match against the user's name. |
| `email` | String | No | Partial match against the email address. |
| `department` | String | No | Partial match against the department. |

Empty strings are ignored.

**Example Request**

```bash
curl -X POST http://localhost:3000/users/count \
  -H "Content-Type: application/json" \
  -d '{"name":"Gerald","email":"","department":"DevOps"}'
```

**Success Response — `200 OK`**

```json
{
  "count": "2"
}
```

The count is illustrative. PostgreSQL `COUNT(*)` is returned as a string by the default `pg` driver.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `500 Internal Server Error` | Database query fails. |

#### 4. Filter Users

**Method:** `POST`

**Endpoint:** `/users/filter`

**Description:** Retrieves users matching the supplied filters, with optional sorting and pagination.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | No | Partial match against the user's name. |
| `email` | String | No | Partial match against the email address. |
| `department` | String | No | Partial match against the department. |
| `limit` | Integer | No* | Number of records per page, from 1 to 100. |
| `page` | Integer | No* | Positive page number, starting at 1. |
| `sort` | String | No | Allowed fields: `name`, `email`, `department`, `created_at`. |

*If either `limit` or `page` is supplied, both must be valid. Pagination is applied only when both are provided.*

Empty filter strings are ignored. Multiple filters are combined using `AND`.

**Example Request**

```bash
curl -X POST http://localhost:3000/users/filter \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gerald",
    "email": "",
    "department": "DevOps",
    "limit": 10,
    "page": 1,
    "sort": "name"
  }'
```

**Success Response — `200 OK`**

Returns a JSON array of matching user objects.

```json
[
  {
    "id": 1,
    "name": "Gerald Saber",
    "email": "g.saber@analytics.com",
    "department": "DevOps",
    "created_at": "2026-10-01T03:00:00.000Z"
  }
]
```

The example data is illustrative.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid pagination parameters. |
| `500 Internal Server Error` | Database query fails. |

If `sort` is omitted or empty, results are ordered by `id`. An unsupported non-empty sort value is ignored, and no explicit ordering is applied.

#### 5. Create User

**Method:** `POST`

**Endpoint:** `/users`

**Description:** Creates a new user and returns the inserted record.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | User's name; cannot be empty. |
| `email` | String | Yes | User's email address; cannot be empty and must be unique. |
| `department` | String | Yes | User's department; cannot be empty. |

**Example Request**

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gerald Saber",
    "email": "g.saber@analytics.com",
    "department": "DevOps"
  }'
```

**Success Response — `200 OK`**

Returns the created user as a JSON object, including its generated `id` and `created_at`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | A required field is missing or empty. |
| `500 Internal Server Error` | Database query fails, including a duplicate email address. |

#### 6. Update User

**Method:** `PUT`

**Endpoint:** `/users/id/:id`

**Description:** Updates the supplied fields of an existing user. Only provided fields are updated.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive user ID. |

**Request Body**

Accepts any combination of `name`, `email`, and `department`. Each supplied field must be a non-empty string.

At least one field must be provided. Email addresses must remain unique.

**Example Request**

```bash
curl -X PUT http://localhost:3000/users/id/4 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gerald Saber",
    "email": "g.saber@analytics.com",
    "department": "DevOps"
  }'
```

**Success Response — `200 OK`**

```json
{
  "message": "User updated successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid user ID, invalid field value, or no fields to update. |
| `404 Not Found` | User does not exist. |
| `500 Internal Server Error` | Database query fails, including a duplicate email address. |

#### 7. Delete User

**Method:** `DELETE`

**Endpoint:** `/users/id/:id`

**Description:** Deletes a user by ID. Tasks assigned to that user are retained, but their `assignee_id` becomes `NULL` because the database schema uses `ON DELETE SET NULL`.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive user ID. |

**Example Request**

```bash
curl -X DELETE http://localhost:3000/users/id/4
```

**Success Response — `200 OK`**

```json
{
  "message": "User deleted successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid user ID. |
| `404 Not Found` | User does not exist. |
| `500 Internal Server Error` | Database query fails. |

#### General Notes

- The API uses JSON request and response bodies where applicable.
- Filtering uses partial matching with SQL `LIKE`; multiple filters are combined using `AND`.
- Database queries use parameterized values for user-supplied filter values.
- User email addresses must be unique.
- Deleting a user does not delete their assigned tasks; it clears the task assignee reference.

### Projects

Base URL: `http://localhost:3000/projects`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | Health |
| GET | `/projects/id/:id` | Get a project by ID |
| POST | `/projects/count` | Count matching projects |
| POST | `/projects/filter` | Filter projects |
| POST | `/projects` | Create a project |
| PUT | `/projects/id/:id` | Update a project |
| DELETE | `/projects/id/:id` | Delete a project |

#### 1. Get Project API Status

**Method:** `GET`

**Endpoint:** `/projects`

**Description:** Returns a message indicating the project API endpoint is accessible. This does not check database connectivity.

**Example Request**

```bash
curl -i http://localhost:3000/projects
```

**Success Response — `200 OK`**

```json
{
  "message": "Project API endpoint"
}
```

#### 2. Get Project by ID

**Method:** `GET`

**Endpoint:** `/projects/id/:id`

**Description:** Retrieves one project by its ID.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive project ID. |

**Example Request**

```bash
curl -i http://localhost:3000/projects/id/1
```

**Success Response — `200 OK`**

Returns a JSON object containing the project's fields: `id`, `name`, `description`, `department`, `status`, `start_date`, `end_date`, and `created_at`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project ID. |
| `404 Not Found` | Project does not exist. |
| `500 Internal Server Error` | Database query fails. |

#### 3. Count Projects

**Method:** `POST`

**Endpoint:** `/projects/count`

**Description:** Counts projects matching the supplied filters. All filters are optional and are combined using `AND`.

**Request Body**

| Field | Type | Matching Behavior |
|---|---|---|
| `name` | String | Partial match |
| `department` | String | Partial match |
| `status` | String | Exact match: `planned`, `in_progress`, `completed`, or `cancelled` |

Empty strings are ignored.

**Example Request**

```bash
curl -X POST http://localhost:3000/projects/count \
  -H "Content-Type: application/json" \
  -d '{"name":"Warehouse","department":"Engineering","status":"in_progress"}'
```

**Success Response — `200 OK`**

```json
{
  "count": "2"
}
```

The count above is illustrative; the actual value depends on the database contents. PostgreSQL `COUNT(*)` is returned as a string by the default `pg` driver.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project status. |
| `500 Internal Server Error` | Database query fails. |

#### 4. Filter Projects

**Method:** `POST`

**Endpoint:** `/projects/filter`

**Description:** Retrieves projects matching the supplied filters, with optional sorting and pagination.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | No | Partial match against the project name. |
| `department` | String | No | Partial match against the department. |
| `status` | String | No | Exact match: `planned`, `in_progress`, `completed`, or `cancelled`. |
| `limit` | Integer | No* | Number of records per page, from 1 to 100. |
| `page` | Integer | No* | Positive page number, starting at 1. |
| `sort` | String | No | Allowed fields: `name`, `department`, `status`, `start_date`, `end_date`, `created_at`. |

*If either `limit` or `page` is supplied, both must be valid. Pagination is applied only when both are provided.*

Empty filter strings are ignored. Multiple filters are combined using `AND`.

**Example Request**

```bash
curl -X POST http://localhost:3000/projects/filter \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warehouse",
    "department": "Engineering",
    "status": "in_progress",
    "limit": 10,
    "page": 1,
    "sort": "name"
  }'
```

**Success Response — `200 OK`**

Returns a JSON array of matching project objects.

```json
[
  {
    "id": 1,
    "name": "Warehouse Management System",
    "description": "Develop a warehouse management application.",
    "department": "Engineering",
    "status": "in_progress",
    "start_date": "2026-10-01",
    "end_date": "2026-12-31",
    "created_at": "2026-10-01T03:00:00.000Z"
  }
]
```

The example project is illustrative.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project status or pagination parameters. |
| `500 Internal Server Error` | Database query fails. |

If `sort` is omitted or empty, results are ordered by `id`. An unsupported non-empty sort value is ignored, and no explicit ordering is applied.

#### 5. Create Project

**Method:** `POST`

**Endpoint:** `/projects`

**Description:** Creates a new project and returns the inserted record.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Project name; cannot be empty. |
| `description` | String or `null` | No | Project description. Defaults to `null`. |
| `department` | String | Yes | Department name; cannot be empty. |
| `status` | String | No | `planned`, `in_progress`, `completed`, or `cancelled`. Defaults to `planned`. |
| `start_date` | Date or `null` | No | Project start date. |
| `end_date` | Date or `null` | No | Project end date; cannot precede the start date when both dates are supplied. |

Dates should use `YYYY-MM-DD` format.

**Example Request**

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warehouse Upgrade",
    "description": "Upgrade warehouse operations.",
    "department": "IT",
    "status": "planned",
    "start_date": "2026-11-01",
    "end_date": "2026-12-31"
  }'
```

**Success Response — `200 OK`**

Returns the newly created project as a JSON object, including its generated `id` and `created_at`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Missing required fields, invalid status, or invalid project dates. |
| `500 Internal Server Error` | Database query fails for another reason. |

#### 6. Update Project

**Method:** `PUT`

**Endpoint:** `/projects/id/:id`

**Description:** Updates the supplied fields of an existing project. Only provided fields are updated.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive project ID. |

**Request Body**

Accepts any combination of `name`, `description`, `department`, `status`, `start_date`, and `end_date`, using the same field types and status values as Create Project.

At least one field must be supplied. An empty `description` is allowed. An empty `start_date` or `end_date` clears that date by setting it to `null`.

**Example Request**

```bash
curl -X PUT http://localhost:3000/projects/id/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warehouse Upgrade",
    "department": "IT"
  }'
```

**Success Response — `200 OK`**

```json
{
  "message": "Project updated successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid ID, invalid field values, invalid dates, or no fields to update. |
| `404 Not Found` | Project does not exist. |
| `500 Internal Server Error` | Database query fails for another reason. |

#### 7. Delete Project

**Method:** `DELETE`

**Endpoint:** `/projects/id/:id`

**Description:** Deletes a project by ID. Tasks associated with the project are also deleted because the database schema uses `ON DELETE CASCADE` for `tasks.project_id`.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive project ID. |

**Example Request**

```bash
curl -X DELETE http://localhost:3000/projects/id/1
```

**Success Response — `200 OK`**

```json
{
  "message": "Project deleted successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project ID. |
| `404 Not Found` | Project does not exist. |
| `500 Internal Server Error` | Database query fails. |

**General Notes**

- The API uses JSON request and response bodies where applicable.
- Database queries use parameterized values for user-supplied data.
- The project status must be one of `planned`, `in_progress`, `completed`, or `cancelled`.
- Deleting a project also deletes its associated tasks. Review this behavior before deleting project records.

### Tasks

Base URL: `http://localhost:3000/tasks`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | Health |
| GET | `/tasks/id/:id` | Get a task by ID |
| POST | `/tasks/count` | Count matching tasks |
| POST | `/tasks/filter` | Filter tasks |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/id/:id` | Update a task |
| DELETE | `/tasks/id/:id` | Delete a task |

#### 1. Get Task API Status

**Method:** `GET`

**Endpoint:** `/tasks`

**Description:** Returns a message indicating the task API endpoint is accessible. Does not check database connectivity.

**Example Request**

```bash
curl -i http://localhost:3000/tasks
```

**Success Response — `200 OK`**

```json
{
  "message": "Task API endpoint"
}
```

#### 2. Get Task by ID

**Method:** `GET`

**Endpoint:** `/tasks/id/:id`

**Description:** Retrieves one task by its ID.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive task ID. |

**Example Request**

```bash
curl -i http://localhost:3000/tasks/id/1
```

**Success Response — `200 OK`**

Returns a JSON object containing the task fields: `id`, `project_id`, `assignee_id`, `title`, `description`, `status`, `progress`, `due_date`, `created_at`, and `updated_at`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid task ID. |
| `404 Not Found` | Task does not exist. |
| `500 Internal Server Error` | Database query fails. |

#### 3. Count Tasks

**Method:** `POST`

**Endpoint:** `/tasks/count`

**Description:** Counts tasks matching the supplied filters. All filters are optional and are combined using `AND`.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `project_id` | Integer | No | Exact project ID match; must be positive. |
| `assignee_id` | Integer | No | Exact assignee user ID match; must be positive. |
| `title` | String | No | Partial match against the task title. |
| `status` | String | No | Exact match: `todo`, `in_progress`, `completed`, or `blocked`. |
| `progress` | Integer | No | Exact progress match from 0 to 100. |

Empty strings disable their corresponding filters.

**Example Request**

```bash
curl -X POST http://localhost:3000/tasks/count \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "assignee_id": "",
    "title": "database",
    "status": "in_progress",
    "progress": ""
  }'
```

**Success Response — `200 OK`**

```json
{
  "count": "2"
}
```

The count is illustrative. PostgreSQL `COUNT(*)` is returned as a string by the default `pg` driver.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project ID, assignee ID, task status, or progress value. |
| `500 Internal Server Error` | Database query fails. |

#### 4. Filter Tasks

**Method:** `POST`

**Endpoint:** `/tasks/filter`

**Description:** Retrieves tasks matching the supplied filters, with optional sorting and pagination.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `project_id` | Integer | No | Exact project ID match; must be positive. |
| `assignee_id` | Integer | No | Exact assignee user ID match; must be positive. |
| `title` | String | No | Partial match against the task title. |
| `status` | String | No | Exact match: `todo`, `in_progress`, `completed`, or `blocked`. |
| `progress` | Integer | No | Exact progress match from 0 to 100. |
| `limit` | Integer | No* | Number of records per page, from 1 to 100. |
| `page` | Integer | No* | Positive page number, starting at 1. |
| `sort` | String | No | Allowed fields: `project_id`, `assignee_id`, `title`, `status`, `progress`, `due_date`, `created_at`, `updated_at`. |

*If either `limit` or `page` is supplied, both must be valid. Pagination is applied only when both are provided.*

Empty filter strings are ignored. Multiple filters are combined using `AND`.

**Example Request**

```bash
curl -X POST http://localhost:3000/tasks/filter \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "assignee_id": "",
    "title": "database",
    "status": "in_progress",
    "progress": "",
    "limit": 10,
    "page": 1,
    "sort": "created_at"
  }'
```

**Success Response — `200 OK`**

Returns a JSON array of matching task objects.

```json
[
  {
    "id": 1,
    "project_id": 1,
    "assignee_id": 1,
    "title": "Configure database",
    "description": "Set up the project database.",
    "status": "in_progress",
    "progress": 50,
    "due_date": "2026-10-30",
    "created_at": "2026-10-01T03:00:00.000Z",
    "updated_at": "2026-10-10T03:00:00.000Z"
  }
]
```

The example data is illustrative.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid project ID, assignee ID, task status, progress, or pagination parameters. |
| `500 Internal Server Error` | Database query fails. |

If `sort` is omitted or empty, results are ordered by task ID. An unsupported non-empty sort value is ignored, and no explicit ordering is applied.

#### 5. Create Task

**Method:** `POST`

**Endpoint:** `/tasks`

**Description:** Creates a task associated with an existing project. Assignment to a user is optional.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `project_id` | Integer | Yes | Positive ID of an existing project. |
| `assignee_id` | Integer or `null` | No | Positive ID of an existing user, or `null` for an unassigned task. |
| `title` | String | Yes | Task title; cannot be empty. |
| `description` | String or `null` | No | Task description. Defaults to `null`. |
| `status` | String | No | `todo`, `in_progress`, `completed`, or `blocked`. Defaults to `todo`. |
| `progress` | Integer | No | Progress from 0 to 100. Defaults to `0`. |
| `due_date` | Date or `null` | No | Task due date in `YYYY-MM-DD` format. |

**Example Request**

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "assignee_id": 1,
    "title": "Configure database",
    "description": "Set up the project database.",
    "status": "in_progress",
    "progress": 50,
    "due_date": "2026-10-30"
  }'
```

**Success Response — `200 OK`**

Returns the newly created task as a JSON object, including its generated ID and timestamps.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Missing or invalid project ID, invalid assignee ID, missing title, invalid status or progress, nonexistent project or assignee, or invalid due date. |
| `500 Internal Server Error` | Database query fails for another reason. |

#### 6. Update Task

**Method:** `PUT`

**Endpoint:** `/tasks/id/:id`

**Description:** Updates the supplied fields of an existing task. The `updated_at` timestamp is refreshed automatically.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive task ID. |

**Request Body**

Accepts any combination of the following fields:

| Field | Type | Description |
|---|---|---|
| `project_id` | Integer | Positive ID of an existing project. |
| `assignee_id` | Integer or `null` | Positive ID of an existing user, or `null` to unassign the task. An empty string also clears the assignment. |
| `title` | String | Non-empty task title. |
| `description` | String or `null` | Task description. |
| `status` | String | `todo`, `in_progress`, `completed`, or `blocked`. |
| `progress` | Integer | Progress from 0 to 100. |
| `due_date` | Date or `null` | Due date in `YYYY-MM-DD` format, or an empty string to clear the date. |

At least one field must be supplied.

**Example Request**

```bash
curl -X PUT http://localhost:3000/tasks/id/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "progress": 100
  }'
```

**Success Response — `200 OK`**

```json
{
  "message": "Task updated successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid task ID, invalid field value, nonexistent project or assignee, invalid due date, or no fields to update. |
| `404 Not Found` | Task does not exist. |
| `500 Internal Server Error` | Database query fails for another reason. |

#### 7. Delete Task

**Method:** `DELETE`

**Endpoint:** `/tasks/id/:id`

**Description:** Deletes a task by ID.

**Path Parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Positive task ID. |

**Example Request**

```bash
curl -X DELETE http://localhost:3000/tasks/id/1
```

**Success Response — `200 OK`**

```json
{
  "message": "Task deleted successfully"
}
```

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid task ID. |
| `404 Not Found` | Task does not exist. |
| `500 Internal Server Error` | Database query fails. |

#### General Notes

- Task statuses are `todo`, `in_progress`, `completed`, and `blocked`.
- Task progress must be an integer between 0 and 100.
- Multiple filters are combined using `AND`.
- Task titles use partial matching; IDs, status, and progress use exact matching.
- Tasks reference projects and optionally users. A project or user referenced during creation or update must exist.
- Deleting a user sets the task's `assignee_id` to `NULL`, while deleting a project cascades to its associated tasks.

### System Logs

Base URL: `http://localhost:3000/system_logs`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/system_logs` | Health |
| POST | `/system_logs/count` | Count matching audit logs |
| POST | `/system_logs/filter` | Filter audit logs |

#### 1. Get System Logs API Status

**Method:** `GET`

**Endpoint:** `/system_logs`

**Description:** Returns a message indicating the system logs API endpoint is accessible. Does not check database connectivity.

**Example Request**

```bash
curl -i http://localhost:3000/system_logs
```

**Success Response — `200 OK`**

```json
{
  "message": "System Logs API endpoint"
}
```

#### 2. Count System Logs

**Method:** `POST`

**Endpoint:** `/system_logs/count`

**Description:** Counts system log records matching the supplied filters. All filters are optional and are combined using `AND`.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | Integer | No | Exact user ID match. |
| `action` | String | No | Exact action match, such as `INSERT`, `UPDATE`, or `DELETE`. |
| `entity_type` | String | No | Exact entity type match, such as `user`, `project`, or `task`. |
| `entity_id` | Integer | No | Exact ID of the affected entity. |
| `details` | String | No | Partial text match against the log's JSON details. |

Empty strings, and `null` for ID filters, are ignored. The ID filters are passed to PostgreSQL without explicit route-level validation.

**Example Request**

```bash
curl -X POST http://localhost:3000/system_logs/count \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "action": "UPDATE",
    "entity_type": "task",
    "entity_id": 1,
    "details": "completed"
  }'
```

**Success Response — `200 OK`**

```json
{
  "count": "1"
}
```

The example count is illustrative. PostgreSQL `COUNT(*)` is returned as a string by the default `pg` driver.

**Error Response**

| HTTP Status | Condition |
|---|---|
| `500 Internal Server Error` | Database query fails. |

#### 3. Filter System Logs

**Method:** `POST`

**Endpoint:** `/system_logs/filter`

**Description:** Retrieves system log records matching the supplied filters, with optional sorting and pagination.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | Integer | No | Exact user ID match. |
| `action` | String | No | Exact action match. |
| `entity_type` | String | No | Exact entity type match. |
| `entity_id` | Integer | No | Exact affected entity ID match. |
| `details` | String | No | Partial text match against the log's JSON details. |
| `limit` | Integer | No* | Number of records per page, from 1 to 100. |
| `page` | Integer | No* | Positive page number, starting at 1. |
| `sort` | String | No | Allowed fields: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `created_at`. |

*If either `limit` or `page` is supplied, both must be valid. Pagination is applied only when both are provided.*

All filters are optional and combined using `AND`. Empty string filters and `null` ID filters are ignored.

**Example Request**

```bash
curl -X POST http://localhost:3000/system_logs/filter \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "action": "UPDATE",
    "entity_type": "task",
    "entity_id": 1,
    "details": "completed",
    "limit": 10,
    "page": 1,
    "sort": "created_at"
  }'
```

**Success Response — `200 OK`**

Returns a JSON array of matching system log records.

```json
[
  {
    "id": "1",
    "user_id": "1",
    "action": "UPDATE",
    "entity_type": "task",
    "entity_id": "1",
    "details": {
      "status": "completed"
    },
    "created_at": "2026-10-20T08:30:00.000Z"
  }
]
```

The example data is illustrative. The actual `details` structure depends on the logged operation.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid pagination parameters. |
| `500 Internal Server Error` | Database query fails. |

#### General Notes

- The API returns JSON responses.
- `action`, `entity_type`, `user_id`, and `entity_id` use exact matching.
- `details` uses a partial text match against the text representation of the JSONB column; it is not a structured JSON-path query.
- If `sort` is omitted or empty, records are ordered by `id`. An unsupported non-empty sort value is ignored, and no explicit ordering is applied.
- Pagination supports a maximum of 100 records per page.
- If no records match, the filter endpoint returns an empty JSON array (`[]`).
- Database errors return `500 Internal Server Error`.

### Reports

Base URL: `http://localhost:3000/reports`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports` | Health |
| GET | `/reports/progress_by_dept` | Project and task progress by department |
| POST | `/reports/dept_rank_progress` | Rank departments by progress |
| GET | `/reports/task_status_by_dept` | Task statuses by department |
| GET | `/reports/overdue_tasks` | Find overdue tasks |
| POST | `/reports/upcoming_due_date` | Find upcoming unfinished tasks |
| POST | `/reports/employee_workload` | Employee workload |

The progress report supports JSON output and CSV export using `?format=csv`.

All report endpoints support JSON output by default and CSV export through the `format` query parameter:

- JSON: `/reports/<endpoint>` or `/reports/<endpoint>?format=json`
- CSV: `/reports/<endpoint>?format=csv`

CSV responses are downloaded as attachments with a report-specific filename. If `format` is not `json` or `csv`, the API returns `400 Bad Request`.

#### 1. Get Report API Status

**Method:** `GET`

**Endpoint:** `/reports`

**Description:** Returns a message indicating the report API endpoint is accessible. Does not check database connectivity.

**Example Request**

```bash
curl -i http://localhost:3000/reports
```

**Success Response — `200 OK`**

```json
{
  "message": "Report API endpoint"
}
```

#### 2. Progress by Department

**Method:** `GET`

**Endpoint:** `/reports/progress_by_dept`

**Description:** Summarizes projects and tasks by department, including the average task progress.

**Output Fields**

| Field | Description |
|---|---|
| `department` | Department name. |
| `total_projects` | Number of projects in the department. |
| `total_tasks` | Number of tasks associated with those projects. |
| `average_progress` | Average progress across the department's tasks, rounded to two decimal places. |

**Example Request — JSON**

```bash
curl -i http://localhost:3000/reports/progress_by_dept
```

**Success Response — `200 OK`**

```json
[
  {
    "department": "Engineering",
    "total_projects": "2",
    "total_tasks": "5",
    "average_progress": "65.00"
  }
]
```

The example data is illustrative. PostgreSQL aggregate values may be returned as strings by the `pg` driver.

**Example Request — CSV**

```bash
curl -i "http://localhost:3000/reports/progress_by_dept?format=csv"
```

**CSV Download:** `progress_by_dept.csv`

CSV columns: `department`, `total_projects`, `total_tasks`, `average_progress`.

#### 3. Department Ranking by Progress

**Method:** `POST`

**Endpoint:** `/reports/dept_rank_progress`

**Description:** Ranks departments by average task progress in descending order. Optional criteria can restrict the results to departments meeting minimum project and task counts.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `projects` | Integer | No | Minimum number of projects in a department; must be positive when provided. |
| `tasks` | Integer | No | Minimum number of tasks in a department; must be positive when provided. |

Both criteria are optional and are combined when both are supplied.

**Example Request — JSON**

```bash
curl -X POST "http://localhost:3000/reports/dept_rank_progress" \
  -H "Content-Type: application/json" \
  -d '{"projects": 2, "tasks": 2}'
```

**Success Response — `200 OK`**

```json
[
  {
    "rank": "1",
    "department": "Engineering",
    "total_projects": "2",
    "total_tasks": "5",
    "average_progress": "85.00"
  }
]
```

The example data is illustrative. Departments with equal average progress receive the same rank. Results are displayed in department-name order, not rank order.

**Example Request — CSV**

```bash
curl -i -X POST "http://localhost:3000/reports/dept_rank_progress?format=csv" \
  -H "Content-Type: application/json" \
  -d '{"projects": 2, "tasks": 2}'
```

**CSV Download:** `dept_rank_progress.csv`

CSV columns: `rank`, `department`, `total_projects`, `total_tasks`, `average_progress`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid report format, or an invalid minimum project/task count. |
| `500 Internal Server Error` | Database query fails. |

#### 4. Task Status by Department

**Method:** `GET`

**Endpoint:** `/reports/task_status_by_dept`

**Description:** Summarizes task counts by department, broken down by task status.

**Output Fields**

| Field | Description |
|---|---|
| `department` | Department name. |
| `total_tasks` | Total number of tasks. |
| `completed_tasks` | Number of completed tasks. |
| `in_progress_tasks` | Number of tasks in progress. |
| `blocked_tasks` | Number of blocked tasks. |
| `todo_tasks` | Number of tasks not yet started. |

Departments with projects but no tasks are included, with task counts of zero.

**Example Request — JSON**

```bash
curl -i http://localhost:3000/reports/task_status_by_dept
```

**Success Response — `200 OK`**

```json
[
  {
    "department": "Engineering",
    "total_tasks": "5",
    "completed_tasks": "2",
    "in_progress_tasks": "1",
    "blocked_tasks": "1",
    "todo_tasks": "1"
  }
]
```

The example data is illustrative.

**Example Request — CSV**

```bash
curl -i "http://localhost:3000/reports/task_status_by_dept?format=csv"
```

**CSV Download:** `task_status_by_dept.csv`

CSV columns: `department`, `total_tasks`, `completed_tasks`, `in_progress_tasks`, `blocked_tasks`, `todo_tasks`.

#### 5. Overdue Tasks

**Method:** `GET`

**Endpoint:** `/reports/overdue_tasks`

**Description:** Lists tasks whose due dates are before the current date and whose status is not `completed`. Results are ordered by due date and department.

**Output Fields**

| Field | Description |
|---|---|
| `department` | Project department. |
| `project_name` | Name of the associated project. |
| `task_title` | Task title. |
| `assignee` | Assigned user's name, or `null` if unassigned. |
| `status` | Current task status. |
| `progress` | Task progress percentage. |
| `due_date` | Task due date. |

**Example Request — JSON**

```bash
curl -i http://localhost:3000/reports/overdue_tasks
```

**Success Response — `200 OK`**

```json
[
  {
    "department": "Engineering",
    "project_name": "Website Migration",
    "task_title": "Update deployment configuration",
    "assignee": "Alice",
    "status": "in_progress",
    "progress": 60,
    "due_date": "2026-10-15"
  }
]
```

The example data is illustrative.

**Example Request — CSV**

```bash
curl -i "http://localhost:3000/reports/overdue_tasks?format=csv"
```

**CSV Download:** `overdue_tasks.csv`

CSV columns: `department`, `project_name`, `task_title`, `assignee`, `status`, `progress`, `due_date`.

#### 6. Upcoming Due Dates

**Method:** `POST`

**Endpoint:** `/reports/upcoming_due_date`

**Description:** Lists non-completed tasks due from the current date through the specified number of days in the future, inclusive.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `days` | Integer | No | Number of days to look ahead. Must be positive when provided. Defaults to `7`. |

**Example Request — JSON**

```bash
curl -X POST http://localhost:3000/reports/upcoming_due_date \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

**Success Response — `200 OK`**

```json
[
  {
    "department": "Engineering",
    "project_name": "Website Migration",
    "task_title": "Complete integration testing",
    "assignee": "Bob",
    "status": "in_progress",
    "progress": 80,
    "due_date": "2026-10-25"
  }
]
```

The example data is illustrative.

**Example Request — CSV**

```bash
curl -i -X POST "http://localhost:3000/reports/upcoming_due_date?format=csv" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

**CSV Download:** `upcoming_due_date.csv`

CSV columns: `department`, `project_name`, `task_title`, `assignee`, `status`, `progress`, `due_date`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid report format or invalid number of days. |
| `500 Internal Server Error` | Database query fails. |

#### 7. Employee Workload

**Method:** `POST`

**Endpoint:** `/reports/employee_workload`

**Description:** Summarizes each employee's assigned tasks over a specified lookback period, including completed task counts and average progress. Employees without tasks during the period are also included.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `days` | Integer | No | Lookback period in days, based on task creation time. Must be positive when provided. Defaults to `30`. |

**Output Fields**

| Field | Description |
|---|---|
| `name` | Employee name. |
| `department` | Employee department. |
| `assigned_tasks` | Number of tasks assigned to the employee within the period. |
| `completed_tasks` | Number of those tasks marked completed. |
| `average_progress` | Average progress of those tasks, rounded to two decimal places; may be `null` if no tasks match. |

**Example Request — JSON**

```bash
curl -X POST http://localhost:3000/reports/employee_workload \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

**Success Response — `200 OK`**

```json
[
  {
    "name": "Alice",
    "department": "Engineering",
    "assigned_tasks": "4",
    "completed_tasks": "2",
    "average_progress": "75.00"
  }
]
```

The example data is illustrative.

**Example Request — CSV**

```bash
curl -i -X POST "http://localhost:3000/reports/employee_workload?format=csv" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

**CSV Download:** `employee_workload.csv`

CSV columns: `name`, `department`, `assigned_tasks`, `completed_tasks`, `average_progress`.

**Error Responses**

| HTTP Status | Condition |
|---|---|
| `400 Bad Request` | Invalid report format or invalid number of days. |
| `500 Internal Server Error` | Database query fails. |

#### General Notes

- All report endpoints return JSON by default. Use `?format=csv` to request a CSV attachment where records are available.
- CSV responses use report-specific filenames and column lists.
- Report endpoints return `200 OK` with `{"message":"No records found"}` when the query returns no rows. This response is JSON even when `format=csv` was requested.
- Invalid report formats return `400 Bad Request` with `{"error":"Invalid report format"}`.
- Database errors return `500 Internal Server Error`.
- The reports use the current database contents; example responses above are illustrative.

## Filtering and Pagination

Filter endpoints accept JSON request bodies. Supported filter fields depend on the resource.

Where supported:

- `limit`: number of records per page (1–100).
- `page`: page number, starting at 1.
- `sort`: allowed field used to sort results.

Multiple filters are combined using `AND`. Empty string filters are ignored.

System-log filters use exact matching for `user_id`, `action`, `entity_type`, and `entity_id`. The `details` field supports text search.

## Error Handling

The API returns JSON responses. HTTP `400` indicates an invalid request, while HTTP `500` indicates a server-side error.

## Database

The database schema includes:

- `users`
- `projects`
- `tasks`
- `system_logs`

Database initialization scripts are located in `db/init/`.

## Maintenance

Check container status:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs --tail=50 api
```

View database logs:

```bash
docker compose logs --tail=50 db
```

Stop services without deleting database data:

```bash
docker compose down
```

## Maintenance and Monitoring Scripts

The project includes Bash scripts for database backups, container health checks, and resource usage monitoring. These scripts use the Docker CLI and Docker Compose to interact with the running services.

### 1. Database Backup

**Script:** `scripts/backup-db.sh`

Creates a compressed backup of the PostgreSQL database using `pg_dump` and gzip. Backup files are stored in the `/backups` directory inside the configured Docker volume.

Run the script from the project root:

```bash
bash scripts/backup-db.sh
```

The script uses Docker Compose to execute the database backup, so the database service must be running and accessible.

**Requirements:**
- Docker and Docker Compose installed and available from the command line.
- The database service configured in `compose.yaml`.
- The backup volume mounted at `/backups`.

### 2. Backup File Check

**Script:** `scripts/check-backups.sh`

Checks whether database backup files exist in the `/backups` directory mounted in the database container. If files are found, the script lists them with their sizes and modification timestamps.

Run the script from the project root:

```bash
bash scripts/check-backups.sh
```

**Possible results:**
- **Exit code `0`:** Backup files were found and listed.
- **Exit code `1`:** An error occurred, such as the database service not running or the backup directory not existing.
- **Exit code `2`:** No backup files were found.

**Requirements:**
- Docker and Docker Compose installed and available from the command line.
- The database service (`db`) running.
- The backup volume mounted at `/backups` in the database container.

This script verifies the presence of backup files; it does not validate their contents or confirm that a backup can be restored. For reliable backup verification, perform a separate restore test.

### 3. Container Health Check

**Script:** `scripts/health-check.sh`

Checks the status of the Docker Compose services and inspects container state and health information to help identify stopped or unhealthy containers.

Run the script from the project root:

```bash
bash scripts/health-check.sh
```

Use this script to verify the operational status of the application's containers during troubleshooting or routine checks.

### 4. Resource Usage Monitoring

**Script:** `scripts/resource-usage.sh`

Displays current Docker container resource usage using `docker stats --no-stream`. The output provides a snapshot of resource consumption, including CPU and memory usage.

Run the script from the project root:

```bash
bash scripts/resource-usage.sh
```

This is useful for checking container resource consumption while the application is running.

### Notes

- Run the scripts from the project root so Docker Compose can locate `compose.yaml`.
- Docker must be running, and the user executing the scripts must have permission to access the Docker daemon.
- These are Bash scripts intended for Linux environments. On Windows, use WSL2 or another compatible Bash environment with access to the Docker CLI.
- The backup script creates database backups but does not, by itself, guarantee that backups can be restored. Backup integrity should be verified separately.

## Security Notes

- Configure database credentials through environment variables.
- Do not commit `.env` files containing real credentials.
- This project is an assessment implementation and should be reviewed before production deployment.
