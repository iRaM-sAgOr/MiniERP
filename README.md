# AI Solution USA — Enterprise ERP System

AI Solution USA's Enterprise Resource Planning (ERP) is a premium, high-fidelity workspace engineered for distributed engineering and product teams. It converges secure attendance timecards, automated daily developer logs, team schedules, interactive peer direct messages, and AI-powered operational summaries into a unified dashboard.

---

## 🚀 Key Features

*   **Integrated Attendance Timecard**: Clock in, take sudden or scheduled breaks, and track shift sessions with instant database state updates.
*   **Searchable Task Allocator**: Distribute workload assignments with custom deadlines, detail criteria, and dynamic priority tracking markers.
*   **Daily Summary Drafts**: Structured daily summaries generated from submitted work logs and prepared as professional email drafts for Team Leads and Managers.
*   **Direct Workspace Messages**: Direct communication channel allowing cross-collaboration between developers, managers, and designers.
*   **Zero-Reset Enterprise Policy**: Clean, authoritative data flow suited for enterprise security boundaries with no unrequested reset bypass mechanisms.

---

## 🐳 Local Development with Docker

Docker runtime files are colocated with backend services:

1. `backend/Dockerfile`
2. `backend/docker-compose.local.yml`
3. `backend/docker-compose.prod.yml`

Local backend + PostgreSQL:

```bash
docker compose -f backend/docker-compose.local.yml up --build -d
```

Production backend with cloud PostgreSQL URL:

```bash
docker compose -f backend/docker-compose.prod.yml --env-file .env.production up --build -d
```

---

## 📊 Database Schema & ER Diagram

The system operates on an advanced enterprise relational schema mapped perfectly inside our JSON persistent database storage layers.

```text
+---------------------+
|     TeamMember      |<------------------------+
+---------------------+                         |
| PK: id [String]     |                         |
| role [String]       |                         |
| roleType [Enum]     |                         |
| email [String]      |                         |
| passwordHash [String]                         |
| tlId [String, FK] --+ (Reports to Lead)       |
+---------------------+                         |
    |          |   |                            |
    | 1:N      |   | 1:N                        | 1:N
    v          v   +--------------------------+ |
+------------+ +------------+                 | |
| PunchRecord| |  WorkLog   |                 | |
+------------+ +------------+                 | |
| PK: id     | | PK: id     |                 | |
| FK: userId | | FK: userId |                 | |
+------------+ | items:     |                 | |
               | [          |                 | |
               |   LogItem: |                 | |
               |   {        |                 | |
               |     taskId |-+               | |
               |   }        | |               | |
               | ]          | |               | |
               +------------+ |               | |
                              |               | |
+---------------------+       |               | |
|  EnterpriseProject  |       |               | |
+---------------------+       |               | |
| PK: id [String]     |       |               | |
| name [String]       |       |               | |
| description [String]|       |               | |
+---------------------+       |               | |
    |                         |               | |
    | 1:N                     |               | |
    v                         |               | |
+---------------------+       |               | |
|  TaskDistribution   |<------+ (Linked Task) | |
+---------------------+                       | |
| PK: id [String]     |<----------------------+ (Assigned To Member)
| title [String]      |
| projectName [String] (Denormalized Name)
| estimatedHours [Num]|
| actualHours [Num]   |
| startDate [Date]    |
| endDate [Date]      |
| FK: assignedTo [Str]|
| FK: assignedBy [Str]|
+---------------------+
```

### Database Entities & Field Specifications

#### 1. `TeamMember`
Stores identity contexts, credentials, and organizational mapping.
*   **`id`** (PK, String): Unique identifier (e.g., `user-sagor`).
*   **`name`** (String): Full human display name.
*   **`email`** (String): Corporate email address (used for logging in).
*   **`role`** (String): Functional profile role title (e.g., `Cloud Operations Architect`).
*   **`roleType`** (Enum: `Manager` | `Engineer`): Authorization group boundaries.
*   **`passwordHash`** (String): PBKDF2 salt-hashed password string.
*   **`tlId`** (FK, Nullable String): Reports to another `TeamMember.id`.
*   **`agreementHours`** (Number): Weekly allocated capacity (e.g. `20` or `40`).

#### 2. `EnterpriseProject`
Stores root enterprise workload domains.
*   **`id`** (PK, String): Unique project identifier (e.g., `p_129df`).
*   **`name`** (String): Name of the customer account or platform project portfolio.
*   **`description`** (String): Text detailing scope constraints.
*   **`createdAt`** (String): Date timestamp of project origin.
*   **`createdBy`** (FK, String): ID of the Manager who registered this project.

#### 3. `TaskDistribution`
Manages task deliverables, allocation schedules, and completion scopes.
*   **`id`** (PK, String): Unique task identifier (e.g., `t_index_opt`).
*   **`title`** (String): Actionable task title summary.
*   **`description`** (String): In-depth execution parameters.
*   **`projectName`** (String): Name of the associated `EnterpriseProject`.
*   **`assignedTo`** (FK, String): ID of the target `TeamMember` resolving this task.
*   **`assignedBy`** (FK, String): ID of the creator `TeamMember` (Manager or self-allocated).
*   **`estimatedHours`** (Number): Scope baseline allocated hours (duration).
*   **`actualHours`** (Number): Spent hours aggregated from all logged `WorkLog` intervals linking this taskId.
*   **`startDate`** (Date): Expected start date.
*   **`endDate`** (Date): Milestone due deadline.
*   **`status`** (Enum: `Pending` | `In Progress` | `Completed`).
*   **`priority`** (Enum: `Low` | `Medium` | `High`).

#### 4. `WorkLog`
Aggregates daily engineering achievements, github references, and links to tasks.
*   **`id`** (PK, String): Unique log identifier.
*   **`userId`** (FK, String): ID of the submitting `TeamMember`.
*   **`date`** (Date Code YYYY-MM-DD): Filing interval day.
*   **`items`** (Array): Containing `LogItem` child records:
    *   **`project`** (String): Manual or autofilled project portfolio name.
    *   **`category`** (Enum: `Feature`, `Bugfix`, etc.).
    *   **`description`** (String): Specific development accomplishment.
    *   **`hoursSpent`** (Number): Decimal hours recorded in this interval.
    *   **`taskId`** (FK, Nullable String): Linkage pointing to corresponding task deliverables.

---

## 🛠️ Tech Stack & Dependencies

*   **Frontend**: React 18 with Vite, styled elegantly with **Tailwind CSS**.
*   **Backend**: Node.js & **Express** running on port 8080.
*   **State Management**: Real-time server-synced local storage buffers.
*   **Icons**: Clean geometric iconography powered by `lucide-react`.

---

## 🚀 Simplest Run Model

Yes, your proposed model is the simplest and cleanest operational setup for this project.

Local:

1. Frontend runs with `npm run dev`.
2. Backend + PostgreSQL run with Docker Compose.
3. Backend container auto-applies Prisma migrations on startup.

Production:

1. Frontend runs with PM2.
2. Backend runs with Docker Compose.
3. Backend connects to a managed cloud PostgreSQL URL via `DATABASE_URL`.

---

## 🔌 Realtime Chat Improvement Notes

Current Socket.IO mapping strategy:

1. Socket IDs are treated as temporary transport IDs (they change on reconnect).
2. User ID is treated as the stable identity for message routing.
3. On connect/reconnect, frontend emits a join event with `userId`.
4. Backend adds the socket to a room keyed by user identity: `user:<userId>`.
5. Direct messages are emitted to sender and receiver rooms, not to raw socket IDs.

Why this works:

1. Reconnect is safe: user gets a new socket ID but rejoins the same user room.
2. Multi-tab/device is supported: all sockets for that user receive updates.
3. Persistence is independent of socket lifecycle because chat writes are stored in DB first.

Planned hardening improvement:

1. Do not trust `senderId` from client payload.
2. Bind authenticated user identity to socket during handshake/auth middleware.
3. Resolve sender from socket context server-side before persisting/sending.

This hardening closes sender spoofing risk while preserving current room-based routing.

---

## 🐘 Local Development (Frontend on Host, Backend+DB in Docker)

### 1. Install workspace dependencies

```bash
npm install
```

### 2. Configure root env for secrets

Create/update `backend/.env` with runtime values (`JWT_SECRET`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`).

### 3. Start backend + PostgreSQL with auto migration

```bash
docker compose -f backend/docker-compose.local.yml up --build -d
```

This starts:

1. `postgres` container (local database)
2. `backend` container (API) and runs Prisma generate + migrate deploy automatically

Backend API URL:

```text
http://localhost:8080
```

### 4. Run frontend on host machine

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

Stop local backend/db:

```bash
docker compose -f backend/docker-compose.local.yml down
```

---

## ☁️ Production (PM2 Frontend + Docker Backend + Cloud DB)

### 1. Set production env file for backend

Create `backend/.env.production` (or inject through your platform):

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public&sslmode=require
```

### 2. Run backend with Docker Compose (cloud DB URL)

```bash
docker compose -f backend/docker-compose.prod.yml --env-file backend/.env.production up --build -d
```

On container startup, backend auto-runs `prisma migrate deploy` and then starts the API.

### 3. Run frontend with PM2

Build frontend:

```bash
npm run build --workspace=minierp-frontend
```

Start frontend preview server with PM2:

```bash
pm2 start "npm run preview --workspace=minierp-frontend -- --host 0.0.0.0 --port 3000" --name minierp-frontend
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs minierp-frontend
pm2 restart minierp-frontend
```


// Feature plan
1. In the frontend there are many calculations, but those calculation should have api and frontend should only get the related data.
2. the local development should have completely different dockerFile/composer/db with same migration 
