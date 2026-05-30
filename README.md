# AI Solution USA — Enterprise ERP System

AI Solution USA's Enterprise Resource Planning (ERP) is a premium, high-fidelity workspace engineered for distributed engineering and product teams. It converges secure attendance timecards, automated daily developer logs, team schedules, interactive peer direct messages, and AI-powered operational summaries into a unified dashboard.

---

## 🚀 Key Features

*   **Integrated Attendance Timecard**: Clock in, take sudden or scheduled breaks, and track shift sessions with instant database state updates.
*   **Searchable Task Allocator**: Distribute workload assignments with custom deadlines, detail criteria, and dynamic priority tracking markers.
*   **Gemini-AI Workspace Summarizer**: High-resolution daily summaries designed to compile developer time metrics and log submissions into custom-formatted email digests for Team Leads and Managers.
*   **Direct Workspace Messages**: Direct communication channel allowing cross-collaboration between developers, managers, and designers.
*   **Zero-Reset Enterprise Policy**: Clean, authoritative data flow suited for enterprise security boundaries with no unrequested reset bypass mechanisms.

---

## 🐳 Local Development with Docker

To run the application locally in a containerized environment, use the provided Docker instructions. This mimics the production runtime and separates application layers.

### 1. Structure the Dockerfile
Create a `Dockerfile` in the root of the project:

```dockerfile
# Use Node.js LTS basis
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency mappings
COPY package*.json ./
RUN npm ci

# Copy codebase
COPY . .

# Build Vite client and bundle Express server-side
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db.json ./db.json

EXPOSE 3000
CMD ["npm", "start"]
```

### 2. Run with Docker Compose
Create a `docker-compose.yml` file to handle local variables and mount persistent databases:

```yaml
version: '3.8'

services:
  erp-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - ./db.json:/app/db.json
```

Run the stack locally:
```bash
docker-compose up --build
```
The application will boot and bind to `http://localhost:3000`.

---

## ☁️ Azure Cloud Deployment

To build a cost-effective, world-class enterprise system in Azure, we recommend using Azure Serverless architectures. This keeps operational costs close to **$0/month** for lightweight setups, only scaling up as actual operational request quotas grow.

### 1. Cost-Effective Database: Azure Cosmos DB (Serverless API for NoSQL)
Azure Cosmos DB is the perfect equivalent to AWS DynamoDB. By utilizing the **Serverless capacity mode**, you are charged strictly for used Request Units (RU) and storage volume consumed, without ongoing provisioned throughput charges.

*   **Free Tier Benefit**: The first 1,000 RU/s throughput and 25 GB of storage are **free forever** in Cosmos DB.
*   **Configuration Setup**: 
    1. Provision an Azure Cosmos DB account with the **API for NoSQL** and choose the **Serverless** capacity option.
    2. Retrieve your Connection String/URI and Private Access Key from the Azure Portal (under *Keys*).
    3. Install the Azure SDK for Node.js: `npm install @azure/cosmos`
    4. Connect your backend in `server.ts` to fetch and store attendance records dynamically.

### 2. Container Host: Azure Container Apps (ACA)
Azure Container Apps lets you deploy serverless containers that can scale down to **zero replicas** when there is no incoming traffic, eliminating idle compute costs.

*   **Free Tier Benefit**: The first 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests are **free every single month**.
*   **Deployment Workflow**:
    ```bash
    # 1. Sign in to Azure CLI
    az login

    # 2. Add container app command extension
    az extension add --name containerapp --upgrade

    # 3. Create a resource group
    az group create --name AISolutionGroup --location eastus

    # 4. Deploy your Dockerized app
    az containerapp up \
      --name aisolution-erp \
      --resource-group AISolutionGroup \
      --source . \
      --ingress external \
      --target-port 3000 \
      --env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE COSMOS_KEY=YOUR_COSMOS_KEY_HERE
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
*   **Backend**: Node.js & **Express** running on port 3000.
*   **State Management**: Real-time server-synced local storage buffers.
*   **AI Engine**: `@google/genai` (SDK) via Gemini Flask endpoints.
*   **Icons**: Clean geometric iconography powered by `lucide-react`.

---

## 🚀 Running Locally with Node Package Manager

If you want to run the application directly in node without container overhead:

1.  **Install base packages**:
    ```bash
    npm install
    ```
2.  **Define Environment Credentials**:
    Create a `.env` file at the project root containing your Gemini API authorization token:
    ```env
    GEMINI_API_KEY=your_actual_gemini_api_key_here
    ```
3.  **Run Dev Mode**:
    ```bash
    npm run dev
    ```
4.  **Production Compile & Run**:
    ```bash
    npm run build
    ```
