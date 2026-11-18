# SecureCloud

**SecureCloud** is an organization-oriented private cloud storage and
file-management application. It provides authenticated access to files,
organization/workspace administration, role-based permissions, file
sharing, storage reporting, and activity/audit features through a React
frontend and a Node.js/Express backend.

> **Repository note:** This README is based on the source tree and
> configuration in the supplied ZIP. It describes implemented code paths
> visible in that snapshot. Deployment-specific values, production
> readiness, and the exact contribution of each teammate should be
> verified separately. Do not treat a feature's presence in a folder as
> proof that it has been fully deployed or production-hardened.

------------------------------------------------------------------------

## Contents

-   [Project at a glance](#project-at-a-glance)
-   [Features](#features)
-   [Technology stack](#technology-stack)
-   [Architecture](#architecture)
-   [Repository structure](#repository-structure)
-   [How the application works](#how-the-application-works)
-   [Prerequisites](#prerequisites)
-   [Configuration](#configuration)
-   [Run with Docker Compose](#run-with-docker-compose)
-   [Run locally without Docker](#run-locally-without-docker)
-   [API overview](#api-overview)
-   [API documentation](#api-documentation)
-   [Databases and migrations](#databases-and-migrations)
-   [Testing](#testing)
-   [Security design](#security-design)
-   [Storage and backups](#storage-and-backups)
-   [Troubleshooting](#troubleshooting)
-   [Team and contribution notes](#team-and-contribution-notes)
-   [Future improvements](#future-improvements)
-   [License](#license)

------------------------------------------------------------------------

## Project at a glance

  -----------------------------------------------------------------------
  Item                                Details
  ----------------------------------- -----------------------------------
  Project                             SecureCloud

  Category                            Private cloud storage and
                                      organization file management

  Frontend                            React 19, Vite, React Router,
                                      Axios, Tailwind CSS

  Backend                             Node.js, Express 4

  Relational database                 PostgreSQL 17

  Document database                   MongoDB 8

  Authentication                      JSON Web Tokens (JWT), password
                                      hashing with bcryptjs

  API styles                          REST, GraphQL, SOAP service
                                      definition

  API documentation                   OpenAPI 3 document served through
                                      Swagger UI

  Testing                             Jest and Supertest

  Runtime packaging                   Docker and Docker Compose
  -----------------------------------------------------------------------

### Problem statement

Organizations need a central place to store and manage documents while
controlling which users can view, upload, share, or administer those
documents. SecureCloud is designed to provide that shared workspace with
account authentication, role-aware operations, file handling, and
organization-level administration.

### Main objectives

1.  Provide a single web interface for users to work with organizational
    files.
2.  Authenticate users before allowing access to protected resources.
3.  Apply role-based authorization to administrative and management
    operations.
4.  Store file metadata and application data in databases while keeping
    uploaded content in managed storage.
5.  Support file upload, listing, download, preview, integrity
    verification, deletion, and sharing workflows.
6.  Provide organization, department, user, storage-plan, and
    activity-management capabilities.
7.  Expose documented APIs and demonstrate REST, GraphQL, and SOAP
    technologies.
8.  Improve reliability through validation, rate limiting, consistent
    error responses, logging, and automated tests.

------------------------------------------------------------------------

## Features

### 1. Authentication and accounts

The backend exposes registration and login endpoints under
`/api/v1/auth`. Request payloads are validated before the controller
handles them. The frontend authentication service sends credentials to
the backend and stores the returned JWT in browser `localStorage` under
`securecloud_token`.

The frontend attaches the token to API requests using the HTTP header:

``` http
Authorization: Bearer <JWT>
```

The backend includes authentication middleware and middleware that loads
the current database-backed user. Protected routes use these middleware
layers before executing operations.

### 2. File management

The file API includes operations for:

-   Uploading file content.
-   Creating file metadata.
-   Listing files available to the authenticated user.
-   Retrieving file metadata.
-   Downloading file content.
-   Previewing file content.
-   Verifying file integrity.
-   Deleting files.
-   Viewing storage summaries and file audit logs where the caller has
    the required role.

The file routes apply authentication and current-user loading. File
upload uses Multer and an additional actual-file-type validation
middleware. The configured upload error handling reports a 413 response
when the 10 MB file-size limit is exceeded.

### 3. Organization and workspace management

The workspace API includes routes for:

-   Viewing and updating the user's profile.
-   Viewing and updating organization information (admin-only).
-   Viewing and updating the storage plan (admin-only).
-   Generating and revoking organization invitation codes (admin-only).
-   Reading dashboard statistics (admin-only).
-   Reading activity information.
-   Listing users (admin/manager), creating and updating users (admin).
-   Listing departments (admin/manager), creating, updating, and
    deleting departments (admin).
-   Creating, listing, and deleting personal folders.
-   Listing shared files, creating shares, listing shares, and revoking
    shares.

The route definitions enforce roles for administrative operations. The
exact permission checks and business rules are implemented in the
backend middleware, controllers, and services.

### 4. Role-aware access

The codebase contains `authMiddleware`, `loadCurrentUser`, and
`requireRoles` middleware. These separate two concerns:

-   **Authentication:** establish that the request has a valid identity.
-   **Authorization:** check whether the authenticated user has a role
    permitted to perform the operation.

The route layer explicitly restricts several organization, department,
user, storage-plan, statistics, and audit operations to admin and/or
manager roles.

### 5. Activity and audit tracking

The backend includes an `ActivityLog` model and an activity-log service.
File audit tracking and related schema changes are also represented in
the migration set. These components support recording and retrieving
relevant activity for monitoring and administration.

### 6. Storage management

The project contains organization storage management code, storage-plan
routes, storage summary functionality, and migrations related to storage
quotas. Uploaded files are stored under the configured storage root
rather than being embedded directly in ordinary API responses.

### 7. REST API capabilities

The Express application includes several API reliability and
interoperability features:

-   Versioned routes under `/api/v1`.
-   Request validation using AJV schemas.
-   A consistent error-response utility and centralized error handling.
-   Rate limiting with standard rate-limit headers.
-   Idempotency middleware for file-metadata creation.
-   ETag/cache-related behavior and conditional request tests.
-   Deliberate cache-control behavior for private GET responses.
-   JSON/XML content-negotiation utility and tests.
-   Structured HTTP logging with a correlation/request ID.
-   CORS restricted to the configured frontend origin.
-   Security headers through Helmet.

### 8. GraphQL

A GraphQL router is mounted at:

``` text
/api/v1/graphql
```

The checked-in GraphQL schema defines a `File` type and two query
fields:

-   `myFiles(limit: Int = 10)` --- retrieves files for the current user,
    subject to resolver behavior.
-   `myFile(id: ID!)` --- retrieves one file by ID, subject to resolver
    authorization.

GraphQL schema and resolvers are in `backend/src/graphql/`.

### 9. SOAP

The backend includes a SOAP server attachment and a WSDL file at
`backend/src/soap/securecloud.wsdl`. The WSDL describes a
`SecureCloudService` with a `HealthCheck` operation. The WSDL currently
advertises the local service address `http://localhost:5000/soap`;
update the service address for another environment if required.

### 10. API documentation

The OpenAPI document is stored at:

``` text
backend/src/docs/openapi.yaml
```

The Express application serves Swagger UI at `/api-docs` and the raw
OpenAPI document at `/api-docs.json`.

------------------------------------------------------------------------

## Technology stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  User interface          React 19                Component-based
                                                  frontend

  Development/build       Vite                    Frontend development
                                                  server and production
                                                  build

  Routing                 React Router DOM        Client-side page
                                                  navigation

  HTTP client             Axios                   Frontend-to-backend
                                                  requests

  Styling                 Tailwind CSS            Utility-based styling

  Icons                   Lucide React            Interface icons

  Server                  Node.js + Express       HTTP API and
                                                  application logic

  SQL access              `pg`                    PostgreSQL connectivity

  Document database       Mongoose                MongoDB integration

  Authentication          `jsonwebtoken`,         JWT handling and
                          `bcryptjs`              password hashing

  Uploads                 Multer, `file-type`     Multipart upload
                                                  handling and file-type
                                                  checks

  Validation              AJV, `ajv-formats`      JSON Schema request
                                                  validation

  API documentation       Swagger UI Express,     OpenAPI parsing and
                          YAML                    documentation UI

  GraphQL                 Apollo Server, GraphQL  GraphQL endpoint

  SOAP                    `soap`                  SOAP service
                                                  integration

  Security                Helmet, CORS,           HTTP security headers,
                          express-rate-limit      origin policy, rate
                                                  limiting

  Resilience              Opossum                 Circuit-breaker
                                                  capability

  Logging                 Pino, pino-http         Structured
                                                  request/application
                                                  logging

  Tests                   Jest, Supertest         Automated unit/API
                                                  tests

  Containers              Docker, Docker Compose  Local multi-service
                                                  environment
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Architecture

SecureCloud follows a frontend/backend architecture:

``` text
+-----------------------------+
|        User's Browser       |
|                             |
| React pages and components  |
| Axios API client            |
| JWT in localStorage         |
+--------------+--------------+
               |
               | HTTP / JSON
               | Authorization: Bearer <JWT>
               v
+-----------------------------+
|       Express Backend       |
|                             |
| Security / CORS / logging   |
| Rate limiting               |
| Authentication middleware  |
| Role authorization          |
| Request validation         |
|                             |
| REST routes and controllers|
| GraphQL router              |
| SOAP service                |
| Services and repositories  |
+---------+----------+--------+
          |          |
          |          |
          v          v
+----------------+  +------------------+
| PostgreSQL 17  |  | MongoDB 8        |
| Relational     |  | Document data    |
| application    |  | and model-backed |
| records        |  | functionality    |
+----------------+  +------------------+

          |
          v
+-----------------------------+
| Local / mounted file storage|
| SecureCloud_Storage         |
| Uploaded file content      |
+-----------------------------+
```

### Request lifecycle

A typical protected REST request follows this general sequence:

1.  The user performs an action in a React page.
2.  The frontend API service sends an HTTP request to the configured
    backend base URL.
3.  The Axios request interceptor reads the JWT from `localStorage`.
4.  If a token exists, Axios adds the `Authorization: Bearer ...`
    header.
5.  Express applies application-level middleware such as security
    headers, CORS, logging, and rate limiting.
6.  The route's authentication middleware verifies the request identity.
7.  `loadCurrentUser` loads the current database-backed account where
    required.
8.  Role middleware checks permissions for restricted routes.
9.  Request validation checks the payload where configured.
10. The controller invokes the relevant service/repository logic.
11. The backend accesses PostgreSQL, MongoDB, or managed file storage as
    required.
12. The backend returns a response. Errors are routed through the shared
    error-response handling.

------------------------------------------------------------------------

## Repository structure

``` text
Secure_Cloud/
├── backend/
│   ├── migrations/               # SQL migration scripts and migration notes
│   ├── src/
│   │   ├── config/               # PostgreSQL, MongoDB and base SQL schema
│   │   ├── controllers/          # HTTP request handlers
│   │   ├── docs/                 # OpenAPI specification
│   │   ├── graphql/              # GraphQL schema, resolvers and router
│   │   ├── middleware/           # Authentication, roles, validation, uploads
│   │   ├── models/               # MongoDB/Mongoose models
│   │   ├── repositories/         # Data access layer
│   │   ├── routes/               # Express route definitions
│   │   ├── schemas/              # Request validation schemas
│   │   ├── services/             # Business logic
│   │   ├── soap/                 # WSDL and SOAP server
│   │   ├── utils/                # Shared response, XML and outbound helpers
│   │   ├── tests/                # Jest/Supertest test suites
│   │   ├── app.js                # Express app and middleware composition
│   │   └── server.js             # Server startup
│   ├── SecureCloud_Storage/      # Configured file storage directory
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Shared UI components
│   │   │   └── layout/           # Layout components
│   │   ├── pages/                # Login, registration and dashboards
│   │   ├── services/             # Axios API and authentication services
│   │   ├── App.jsx               # Application routes/layout
│   │   └── main.jsx              # React entry point
│   ├── package.json
│   └── vite.config.js
│
├── compose.yaml                  # PostgreSQL, MongoDB and backend services
└── openapi-review.json           # OpenAPI review artifact
```

### Backend directory responsibilities

  -----------------------------------------------------------------------
  Directory/file                      Purpose
  ----------------------------------- -----------------------------------
  `config/`                           Database connection configuration
                                      and base SQL schema

  `controllers/`                      Converts HTTP requests into service
                                      calls and responses

  `routes/`                           Maps HTTP methods and paths to
                                      middleware/controllers

  `middleware/`                       Shared authentication,
                                      authorization, validation and
                                      upload logic

  `schemas/`                          JSON Schema definitions for
                                      validating requests

  `services/`                         Application/business rules

  `repositories/`                     Database access functions

  `models/`                           Mongoose model definitions

  `graphql/`                          GraphQL schema and resolver
                                      functions

  `soap/`                             WSDL and SOAP server setup

  `utils/`                            Shared infrastructure helpers

  `tests/`                            Automated tests

  `migrations/`                       Incremental PostgreSQL schema
                                      changes
  -----------------------------------------------------------------------

### Frontend pages

The checked-in frontend includes these main page components:

-   `Login.jsx` --- user sign-in.
-   `Register.jsx` --- account registration.
-   `Dashboard.jsx` --- user-facing dashboard.
-   `AdminDashboard.jsx` --- administrative dashboard.
-   `ManagerDashboard.jsx` --- manager-facing dashboard.
-   `MyFiles.jsx` --- file management interface.
-   `Profile.jsx` --- profile interface.

Shared UI and layout components are located under
`frontend/src/components/`.

------------------------------------------------------------------------

## How the application works

### User login

1.  A user enters email and password on the login page.
2.  The frontend calls `POST /api/v1/auth/login`.
3.  The backend validates the request and processes authentication.
4.  On successful login, the response includes a token.
5.  The frontend stores the token in `localStorage`.
6.  Subsequent Axios requests include the bearer token.

### File upload

The repository contains separate routes for file content and file
metadata:

-   `POST /api/v1/files/content` --- accepts multipart file content.
-   `POST /api/v1/files` --- creates file metadata and uses idempotency
    middleware plus request validation.

The upload route uses Multer and actual file-type validation. The
metadata route applies an idempotency key middleware and AJV-based
schema validation. Consult the OpenAPI specification and
controller/service code for the exact request fields and response
contract used by the current revision.

### File listing and download

-   `GET /api/v1/files` lists files available to the current user.
-   `GET /api/v1/files/:id` retrieves metadata.
-   `GET /api/v1/files/:id/content` downloads file content.
-   `GET /api/v1/files/:id/preview` previews file content.
-   `GET /api/v1/files/:id/integrity` verifies file integrity.
-   `DELETE /api/v1/files/:id` deletes a file.

The file router applies authentication and loads the current user before
these operations.

### Organization administration

The workspace router contains profile, organization, storage-plan,
invitation-code, statistics, user, department, folder, activity, and
sharing routes. Admin and manager restrictions are applied at route
level where specified in the route definitions.

------------------------------------------------------------------------

## Prerequisites

Install the following before running the application locally:

-   Node.js (a current LTS release compatible with the dependencies).
-   npm.
-   Docker Desktop with Docker Compose, **or** local PostgreSQL 17 and
    MongoDB 8 installations.
-   Git (optional, for cloning and version control).

Check the installed versions:

``` bash
node --version
npm --version
docker --version
docker compose version
```

------------------------------------------------------------------------

## Configuration

### Backend environment

Create a local environment file by copying the example:

**macOS/Linux**

``` bash
cp backend/.env.example backend/.env
```

**Windows PowerShell**

``` powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and set values appropriate for your environment:

``` dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=securecloud
POSTGRES_USER=securecloud_user
POSTGRES_PASSWORD=replace_with_your_local_password

MONGODB_URI=mongodb://localhost:27017/securecloud
JWT_SECRET=replace_with_a_long_random_secret
```

Use a long, unique, randomly generated `JWT_SECRET`. Set a strong
database password. Do not commit `.env` files or put real credentials in
documentation, screenshots, source control, or public issue reports.

The backend `.env.example` is the authoritative list of environment
variables visible in this repository snapshot. If your deployment adds
more configuration, document those additions in your own deployment
notes.

### Frontend environment

The frontend API client uses:

``` js
import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
```

For a local backend on port 5000, no frontend environment variable is
required. To use a different backend base URL, create `frontend/.env`:

``` dotenv
VITE_API_BASE_URL=http://localhost:5000
```

For the Docker Compose mapping in this repository, the backend is
exposed to the host on port **5001**, so a frontend running directly on
the host should use:

``` dotenv
VITE_API_BASE_URL=http://localhost:5001
```

The browser must be able to reach the URL configured here. The backend
`FRONTEND_URL` must match the origin from which the frontend is served.

------------------------------------------------------------------------

## Run with Docker Compose

The root `compose.yaml` defines three services:

  Service      Container                  Internal port   Host port
  ------------ ------------------------ --------------- -----------
  PostgreSQL   `securecloud-postgres`              5432        5432
  MongoDB      `securecloud-mongodb`              27017       27017
  Backend      `securecloud-backend`               5000        5001

The Compose file creates persistent Docker volumes named `postgres_data`
and `mongodb_data`. The backend storage directory is mounted from
`backend/SecureCloud_Storage` into the backend container.

### 1. Configure the backend environment

Create `backend/.env` using the steps above. Ensure the values are
appropriate for the Compose environment. Compose explicitly supplies the
database hostnames `postgres` and `mongodb` to the backend container.

### 2. Start services

Run these commands from the repository root:

``` bash
docker compose up --build -d
```

Check service status:

``` bash
docker compose ps
```

View backend logs:

``` bash
docker compose logs -f backend
```

View database logs:

``` bash
docker compose logs -f postgres
docker compose logs -f mongodb
```

### 3. Check backend health

The Compose mapping exposes container port 5000 on host port 5001:

``` bash
curl http://localhost:5001/health
```

A successful health check returns a JSON response indicating that the
backend is running.

### 4. Start the frontend

The supplied Compose file does not define a frontend service. Run the
frontend separately:

``` bash
cd frontend
npm install
```

Create `frontend/.env`:

``` dotenv
VITE_API_BASE_URL=http://localhost:5001
```

Start Vite:

``` bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Make sure `FRONTEND_URL` in the backend environment matches the frontend
origin, normally `http://localhost:5173`.

### 5. Stop services

``` bash
docker compose down
```

To also remove the persistent database volumes (this permanently deletes
the data stored in those volumes):

``` bash
docker compose down -v
```

Do not use `-v` if you need to retain your local database data.

------------------------------------------------------------------------

## Run locally without Docker

This option assumes PostgreSQL and MongoDB are already installed and
running on your machine.

### 1. Start the databases

Create a PostgreSQL database and user matching the values in
`backend/.env`. Ensure MongoDB is reachable at the configured
`MONGODB_URI`.

### 2. Install and start the backend

From the repository root:

``` bash
cd backend
npm install
```

Create and configure `backend/.env` as described above. Then start the
development server:

``` bash
npm run dev
```

Or start it without nodemon:

``` bash
npm start
```

The backend's default port in the example environment is 5000.

### 3. Install and start the frontend

Open another terminal:

``` bash
cd frontend
npm install
```

Optionally create `frontend/.env`:

``` dotenv
VITE_API_BASE_URL=http://localhost:5000
```

Start the frontend:

``` bash
npm run dev
```

### 4. Create a production frontend build

``` bash
cd frontend
npm run build
```

Vite writes the production build to `frontend/dist/`. To serve the build
locally for a preview:

``` bash
npm run preview
```

------------------------------------------------------------------------

## API overview

The application mounts versioned routes below `/api/v1`.

> This is a route-family overview, not a substitute for the complete
> OpenAPI contract. Check Swagger UI for schemas, parameters, request
> bodies, response codes, and security requirements.

### Health and documentation

  Method   Path               Purpose
  -------- ------------------ --------------------------
  GET      `/health`          Backend health check
  GET      `/api-docs`        Interactive Swagger UI
  GET      `/api-docs.json`   OpenAPI document as JSON

### Authentication

  Method   Path                      Purpose
  -------- ------------------------- ---------------------
  POST     `/api/v1/auth/register`   Register a user
  POST     `/api/v1/auth/login`      Authenticate a user

Authentication endpoints have a dedicated rate limiter.

### Files

All file routes use authentication and current-user loading.

  Method   Path                              Purpose
  -------- --------------------------------- -----------------------
  POST     `/api/v1/files/content`           Upload file content
  POST     `/api/v1/files`                   Create file metadata
  GET      `/api/v1/files`                   List accessible files
  GET      `/api/v1/files/storage/summary`   Admin storage summary
  GET      `/api/v1/files/audit/logs`        Admin file audit logs
  GET      `/api/v1/files/:id`               Get file metadata
  GET      `/api/v1/files/:id/content`       Download file
  GET      `/api/v1/files/:id/preview`       Preview file
  GET      `/api/v1/files/:id/integrity`     Verify file integrity
  DELETE   `/api/v1/files/:id`               Delete file

### Workspace

  -----------------------------------------------------------------------------------------------
  Method                  Path                                            Purpose / access
                                                                          indicated in routes
  ----------------------- ----------------------------------------------- -----------------------
  GET                     `/api/v1/workspace/profile`                     Read own profile

  PATCH                   `/api/v1/workspace/profile`                     Update own profile

  GET                     `/api/v1/workspace/organization`                Read organization
                                                                          (admin)

  PATCH                   `/api/v1/workspace/organization`                Update organization
                                                                          (admin)

  GET                     `/api/v1/workspace/storage-plan`                Read storage plan
                                                                          (admin)

  PATCH                   `/api/v1/workspace/storage-plan`                Update storage plan
                                                                          (admin)

  POST                    `/api/v1/workspace/invitation-code`             Generate invitation
                                                                          code (admin)

  DELETE                  `/api/v1/workspace/invitation-code`             Revoke invitation code
                                                                          (admin)

  GET                     `/api/v1/workspace/stats`                       Dashboard statistics
                                                                          (admin)

  GET                     `/api/v1/workspace/activity`                    Read activity

  GET                     `/api/v1/workspace/users`                       List users
                                                                          (admin/manager)

  POST                    `/api/v1/workspace/users`                       Create user (admin)

  PATCH                   `/api/v1/workspace/users/:id`                   Update user (admin)

  GET                     `/api/v1/workspace/departments`                 List departments
                                                                          (admin/manager)

  POST                    `/api/v1/workspace/departments`                 Create department
                                                                          (admin)

  PATCH                   `/api/v1/workspace/departments/:id`             Update department
                                                                          (admin)

  DELETE                  `/api/v1/workspace/departments/:id`             Delete department
                                                                          (admin)

  GET                     `/api/v1/workspace/folders`                     List personal folders

  POST                    `/api/v1/workspace/folders`                     Create personal folder

  DELETE                  `/api/v1/workspace/folders/:id`                 Delete personal folder

  GET                     `/api/v1/workspace/shared-files`                List shared files

  POST                    `/api/v1/workspace/files/:id/shares`            Create a file share

  GET                     `/api/v1/workspace/files/:id/shares`            List shares for a file

  DELETE                  `/api/v1/workspace/files/:id/shares/:shareId`   Revoke a share
  -----------------------------------------------------------------------------------------------

### GraphQL

Mounted at:

``` text
/api/v1/graphql
```

The current schema defines `myFiles(limit)` and `myFile(id)` query
fields. Use the GraphQL schema and resolvers as the source of truth for
supported fields and authorization behavior.

### SOAP

The WSDL is located at `backend/src/soap/securecloud.wsdl`. It defines
the `SecureCloudService` and a `HealthCheck` operation. The WSDL's
sample SOAP address is `http://localhost:5000/soap`.

------------------------------------------------------------------------

## API documentation

Start the backend, then open:

``` text
http://localhost:5000/api-docs
```

If using Docker Compose, open:

``` text
http://localhost:5001/api-docs
```

Raw OpenAPI JSON:

``` text
http://localhost:5000/api-docs.json
```

(or port `5001` when using Compose).

The source specification is `backend/src/docs/openapi.yaml`. Update that
document when API paths, payloads, response schemas, authentication
requirements, or status codes change.

------------------------------------------------------------------------

## Databases and migrations

### PostgreSQL

PostgreSQL is the relational database. The repository contains:

-   `backend/src/config/postgres.js` --- PostgreSQL connection
    configuration.
-   `backend/src/config/schema.sql` --- base schema.
-   `backend/migrations/` --- incremental schema migrations.

The migration set includes organization foundations, default
organization setup, organization join codes, file sharing, file audit
tracking, and storage quota changes.

**Important:** Read `backend/migrations/README.md` before applying
migrations to an existing database. It explicitly recommends taking a
PostgreSQL backup and reviewing the working tree before applying the
organization foundation migration. Do not blindly run every migration
against an existing or production database.

### MongoDB

MongoDB connectivity is configured in `backend/src/config/mongodb.js`.
The project also includes a Mongoose `ActivityLog` model. MongoDB is
configured as a separate service in Docker Compose.

### Data and file storage are different

The databases hold application records and metadata; uploaded binary
content is kept in the configured filesystem storage directory. Back up
both database data and the file storage directory. A database-only
backup may not be sufficient to restore uploaded documents.

------------------------------------------------------------------------

## Testing

Backend test scripts are defined in `backend/package.json` and use Jest.
Supertest is included for HTTP-level tests.

Run all backend tests:

``` bash
cd backend
npm test
```

The repository contains test suites covering areas such as:

-   Authentication middleware and validation.
-   Role authorization.
-   File ownership and access.
-   File repository and file service behavior.
-   File validation and upload security.
-   Content negotiation.
-   ETag and cache behavior.
-   Error responses and error handling.
-   Idempotency.
-   Pagination.
-   Rate limiting.
-   CORS.
-   GraphQL.
-   Outbound request behavior.
-   Circuit-breaker recovery.
-   Logging and file integrity.

Run a single test file:

``` bash
npx jest tests/authMiddleware.test.js --runInBand
```

Run the frontend lint command:

``` bash
cd frontend
npm run lint
```

Build the frontend:

``` bash
npm run build
```

A passing test suite is useful evidence for the tested cases, but it
does not by itself establish production security, scalability, or
correctness for every possible input and deployment configuration.

------------------------------------------------------------------------

## Security design

The repository contains several security-related controls:

1.  **JWT authentication:** protected routes use authentication
    middleware.
2.  **Role checks:** `requireRoles` protects admin/manager-only
    operations.
3.  **Password hashing:** `bcryptjs` is included in the authentication
    implementation.
4.  **Request validation:** AJV validates configured request schemas.
5.  **Upload validation:** Multer handles multipart uploads and
    file-type validation is applied.
6.  **Upload size control:** the application maps the configured 10 MB
    upload limit to an appropriate error response.
7.  **Rate limiting:** general API and stricter authentication rate
    limiters are configured.
8.  **CORS policy:** the Express app allows the configured frontend
    origin rather than allowing every browser origin.
9.  **Security headers:** Helmet is installed as application middleware.
10. **Error handling:** centralized error handling returns structured
    error responses.
11. **Logging:** Pino HTTP logging uses a correlation ID and redacts the
    Authorization request header.
12. **Private caching policy:** file and workspace GET routes set
    private cache-control behavior.
13. **Idempotency:** file metadata creation uses idempotency middleware.

### Security deployment checklist

Before deploying outside a local development environment:

-   Replace all example passwords and secrets.
-   Use HTTPS and secure reverse-proxy configuration.
-   Set `FRONTEND_URL` to the exact deployed frontend origin.
-   Keep `.env` files out of Git.
-   Restrict database ports and credentials to trusted services.
-   Review authorization checks for every file and organization
    operation.
-   Confirm that users cannot access another user's or organization's
    files by changing an ID.
-   Review file upload limits, accepted types, and storage permissions.
-   Configure backups and test restoration.
-   Review logs to ensure passwords, tokens, and sensitive file contents
    are not recorded.
-   Review CORS, rate limits, cookie/token handling, and JWT
    expiry/rotation policies.
-   Run automated tests and security checks against the deployment
    configuration.

This checklist is operational guidance; it is not a claim that every
item is already configured in the supplied snapshot.

------------------------------------------------------------------------

## Storage and backups

The Compose configuration mounts:

``` text
./backend/SecureCloud_Storage
```

inside the backend container at:

``` text
/app/SecureCloud_Storage
```

The backend environment should use the same storage root. Preserve this
directory when moving or backing up the application.

A complete backup strategy should include:

1.  PostgreSQL database backup.
2.  MongoDB database backup.
3.  The full configured file-storage directory.
4.  Environment/configuration values stored securely (not by committing
    secret files).
5.  A documented restore procedure.

Test restoration periodically. A backup that has never been restored is
not a verified recovery plan.

------------------------------------------------------------------------

## Troubleshooting

### Frontend cannot connect to the backend

-   Confirm the backend is running.
-   Open `/health` on the configured backend host and port.
-   Check `VITE_API_BASE_URL`.
-   Check that backend `FRONTEND_URL` matches the frontend origin.
-   Inspect the browser developer console and backend logs for CORS or
    network errors.

### Docker backend cannot connect to a database

Inside Compose, the backend should connect using service hostnames
`postgres` and `mongodb`, not `localhost`. `localhost` inside the
backend container refers to the backend container itself.

Check:

``` bash
docker compose ps
docker compose logs postgres
docker compose logs mongodb
docker compose logs backend
```

### Port already in use

Check whether another process is using ports 5432, 27017, 5000, or 5001.
Stop the conflicting service or change the host-side port mapping and
update the frontend API URL accordingly.

### Login fails

-   Confirm the backend can connect to PostgreSQL.
-   Check that the account exists and the credentials are correct.
-   Confirm `JWT_SECRET` is configured.
-   Inspect the backend logs without exposing passwords or tokens.

### Uploaded file is too large

The application maps the configured 10 MB upload-size error to HTTP 413.
Reduce the file size or deliberately change the upload limit and related
validation/configuration together.

### Database migration problems

Stop before retrying migrations blindly. Read
`backend/migrations/README.md`, inspect the current schema, take a
backup, and determine which migrations have already been applied.

------------------------------------------------------------------------

## Team and contribution notes

The project was developed by a four-member team:

  Member            Suggested responsibility area
  ----------------- ----------------------------------------------------
  Shirish Meshram   Backend architecture, API and database integration
  Deepamoni Boro    React frontend and user-interface development
  Aman Chouhan      Security and access-management module
  Sanu Sawarnakar   Testing, API documentation and deployment support

**Contribution attribution:** the supplied Git history clearly records
commits under Shirish and Deepa. It does not provide identifiable
individual commits for Aman and Sanu in the inspected history. The table
above is a proposed/functional division for project documentation, not
independently verified Git authorship. Adjust it to match the work each
member actually completed.

### Development workflow

1.  Create a feature branch for a focused change.
2.  Keep backend routes, controllers, services, and repositories
    separated by responsibility.
3.  Update the OpenAPI document when changing the API contract.
4.  Add or update tests for changed behavior.
5.  Run backend tests and frontend lint/build checks.
6.  Never commit secrets, local database dumps, or private uploaded
    documents.
7.  Submit changes through a reviewed pull request.

------------------------------------------------------------------------

## Future improvements

Potential areas to consider for future iterations:

-   Add a dedicated frontend service to Docker Compose.
-   Add CI automation for tests, linting, builds, and
    dependency/security checks.
-   Add production deployment documentation and environment-specific
    configuration examples.
-   Add automated database migration tracking and rollback procedures.
-   Add object-storage support for scalable file storage.
-   Add malware scanning and stronger content-disarm/inspection
    workflows for uploads.
-   Add comprehensive end-to-end tests for user, manager, and admin
    workflows.
-   Add observability dashboards, metrics, and alerting.
-   Add documented retention policies and automated backup verification.
-   Review token storage and session management for the intended threat
    model.
-   Add accessibility and cross-browser UI testing.

------------------------------------------------------------------------

## License

No explicit project license was identified in the inspected repository
snapshot. Add a `LICENSE` file before distributing or reusing the
project under an open-source license. Until then, do not assume that the
project is released under MIT, Apache-2.0, or another license.
